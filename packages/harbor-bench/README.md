# harbor-bench

PagoPA Harbor extensions.

1. **Custom Copilot CLI agent** — `harbor_bench.agents.CopilotCliMod` forwards
   arbitrary `--ak key=value` kwargs verbatim to the Copilot CLI
   (`--kebab-case value`), covering `--max-ai-credits`, `--enable-memory`,
   `--model`, etc. It also fixes skill injection (copies to
   `~/.copilot/skills/`, where Copilot discovers them). Harbor uploads injected
   skills as-is; see [Skill eval data and git sources](#skill-eval-data-and-git-sources)
   for the resulting visibility of eval data in the agent container.
2. **`harbor-bench convert`** — a runtime converter that reads the agentskills.io
   `evals/evals.json` files in the plugins and generates **on the fly** the
   Harbor task structures (task.toml, instruction.md, environment/Dockerfile +
   fixtures, tests/test.sh + RewardKit `tests/quality.toml` judge config,
   solution/solve.sh) plus a ready-to-run `config.yaml`, so
   `harbor run -c config.yaml` finds everything.
3. **`harbor-bench report`** — reads two Harbor job directories and prints a
   per-task delta report (score, tokens, cost, steps, duration), plus a run
   configuration section (agent/judge models and effort, skill versions, git
   diff command). It can also produce a self-contained visual HTML report for
   sharing with less technical users — see
   [Comparing skill versions](#comparing-skill-versions-workspace-vs-git).
4. **`harbor-bench compare`** — one command for the workspace-vs-git workflow:
   it runs the same eval set twice on one generated config (base skill and head
   skill injected into two `harbor run` invocations) and writes the delta
   report between the two job directories — see
   [Comparing skill versions](#comparing-skill-versions-workspace-vs-git).

The goal of `convert` is to avoid refactoring each `evals.json` into the
per-task Harbor config files: `evals.json` stays the source of truth.

## Install

The agent code runs host-side inside the `harbor` process, so `harbor-bench` must
be importable from that same Python environment. Install the workspace
dependencies and invoke the CLI through `uv run`:

```bash
mise run install
uv run --package harbor-bench harbor-bench --help
```

`mise run install` runs `uv sync --all-packages`; `uv run` then selects the
`harbor-bench` workspace member, synchronizes its environment when needed, and
executes the CLI without requiring `source .venv/bin/activate`. The `convert`
command only needs the default dependencies; add `--extra test` when running
the test suite.

## Workflow

```bash
# 1. convert evals.json -> Harbor tasks + config.yaml
uv run --package harbor-bench harbor-bench convert \
  --scan-root plugins --out .harbor --config-out .harbor/config.yaml

# 2. run the eval
uv run --package harbor-bench harbor run \
  -c .harbor/config.yaml -y --ae COPILOT_GITHUB_TOKEN=...
```

`--without-skill` omits the injected skills (baseline comparison). Agent kwargs
can be overridden at convert time with `--ak max_ai_credits=50`.

By default the generated `config.yaml` targets the **docker** environment. To
run the eval with Apple Container instead (see
[Apple Container](#apple-container) below), regenerate the config with
`--environment apple-container` — the tasks themselves are unchanged, only
`[environment].type` in the config flips:

```bash
uv run --package harbor-bench harbor-bench convert \
  --scan-root plugins --out .harbor \
  --config-out .harbor/config.yaml --environment apple-container
```

The injected skills point at the **raw workspace skill directories** (`convert`
no longer stages or copies them). Harbor uploads these directories as-is — see
[Skill eval data and git sources](#skill-eval-data-and-git-sources).

### Apple Container

Harbor 0.22.0 ships an `AppleContainerEnvironment` (`EnvironmentType`
`apple-container`) that runs the same OCI images / Dockerfiles through Apple's
`container` CLI instead of a Docker daemon. `uv run --package harbor-bench
harbor-bench convert --environment apple-container` only rewrites
`[environment].type` in the generated
`config.yaml`; the task Dockerfiles (agent `environment/Dockerfile` and, in
separate-verifier mode, `tests/Dockerfile`) are consumed unchanged, and the
verifier reuses the same environment type automatically.

Requirements and caveats:

- **Host**: Mac with Apple silicon (arm64) on macOS 26+. `convert` fails fast
  with a clear error on other hosts.
- **CLI + kernel**: install the signed package from
  https://github.com/apple/container/releases, then bootstrap the runtime once:

  ```bash
  container system start
  container system kernel set --recommended   # arm64 Linux kernel (required!)
  ```

  Without a configured kernel, `container build` fails with
  `default kernel not configured for architecture arm64` and every trial dies
  at environment start. `convert` verifies the CLI is on `PATH`.

- **Native arm64 only**: the CLI runs Linux VMs without x86 emulation; base
  images must publish arm64 variants (`ubuntu:24.04` does). The generated
  Dockerfile's `ARG TARGETARCH=amd64` is declared but unused — leave it alone,
  or the literal value will be wrong on Apple silicon.
- **Resources**: each trial is its own lightweight VM; `--n-concurrent N` means
  N VMs, and `cpus`/`memory_mb` map directly to VM resources.
- **Network**: `network_mode: public` (the generated default) is ignored by the
  Apple environment, which is fine for these evals.

### Reusing the environment image (faster startup)

By default **every trial builds the environment image from scratch**, while the
generated config sets `environment.delete: false` so the environment remains
available afterwards. The generated config does not set a `docker_image`, so
each `harbor run` still pays a `container build` before the agent starts. The
build itself is cheap — the `container` CLI caches layers, so with an unchanged
task `environment/` it is a ~0.4s cache hit. The historical ~40s setup cost
came mostly from the **Copilot CLI install**
(`curl -fsSL https://gh.io/copilot-install | bash`) inside the fresh container;
the generated `environment/Dockerfile` now bakes the CLI into the image and
`CopilotCliMod` skips the reinstall when `copilot` is already on PATH, so that
step is a no-op for regenerated tasks.

The generated `delete: false` keeps the container and image between runs.
Subsequent runs still issue a `container build` but reuse cached layers instead
of starting cold. Combine this with a prebuilt image (below) to skip the build
entirely.

**Prebuild once and reference it (`docker_image`)** — point the task at an
image that already exists locally, so Harbor skips the build and never deletes
it. Two flavors, both set `docker_image` in the task's `task.toml`:

```toml
[environment]
docker_image = "hb__dr-blacksmith-3-use-case-boundary"
```

- **Workspace baked in the image (image name must match)**. Build the task's
  own `environment/Dockerfile` into the exact tag Harbor would use
  (`hb__<task-short-name>`, i.e. the task directory name lowercased):

  ```bash
  container build \
    -t hb__dr-blacksmith-3-use-case-boundary \
    -f .harbor/tasks/dr-blacksmith-3-use-case-boundary/environment/Dockerfile \
    .harbor/tasks/dr-blacksmith-3-use-case-boundary/environment/
  ```

  Because a Dockerfile is present, the environment dir is **not** re-uploaded at
  runtime: the agent sees exactly what the image baked (`COPY . /workspace/` +
  git baseline). Rebuild after task changes.

- **Generic base image, workspace uploaded at runtime**. Build one reusable
  base image (any tag, e.g. `hb__base`) with the Copilot CLI baked in, then
  remove/rename the task's `environment/Dockerfile` so Harbor uploads the
  environment dir into the workdir at start. One image serves all tasks and
  workspace updates need no rebuild.

> The generated `environment/Dockerfile` already bakes the Copilot CLI into the
> image (`RUN curl -fsSL https://gh.io/copilot-install | bash`), and
> `CopilotCliMod` skips the `curl ... | bash` reinstall when `copilot` is on
> PATH — so regenerated tasks have a no-op install step even without
> `docker_image`.

### Running a subset of tasks

The generated `config.yaml` points the `datasets` entry at the whole `tasks`
directory, so `harbor run -c config.yaml` evaluates every generated task. To
run only a subset, add glob filters to the dataset entry. Task names match the
**task directory name**, which always embeds the eval ID (e.g.
`dr-blacksmith-0-complete-design-review` — `<skill>-<eval-id>-<name>`; the ID
makes names collision-free even when two cases share a name).

Select every task of one skill:

```yaml
datasets:
  - path: /path/to/.harbor/tasks
    task_names:
      - dr-blacksmith-*
```

Select specific tasks (multiple entries act as an OR — include every task
matching any pattern):

```yaml
datasets:
  - path: /path/to/.harbor/tasks
    task_names:
      - dr-blacksmith-0-complete-design-review
      - dr-blacksmith-4-publication-confirmation
```

Other filters:

- `exclude_task_names: [generate-backend-tests-*]` — exclude instead of
  include (applied after `task_names`).
- `n_tasks: 3` — cap the run at the first N matching tasks.

These filters only apply when running from the config file (`-c config.yaml`);
there is no equivalent CLI flag for a `--config`-based run.

## Agent model and reasoning effort

`convert` bakes the **Copilot model** and **reasoning effort** into the
generated `config.yaml`. The defaults are:

- model: `gpt-5.6-luna` (`harbor_bench.convert.config.DEFAULT_MODEL`)
- effort: `high` (`harbor_bench.convert.config.DEFAULT_AGENT_KWARGS`)

so the emitted agent entry looks like:

```yaml
agents:
  - import_path: harbor_bench.agents.copilot_cli_mod:CopilotCliMod
    model_name: gpt-5.6-luna # -> copilot --model=gpt-5.6-luna
    kwargs:
      reasoning_effort: high # -> copilot --effort high
    skills: [...]
```

`reasoning_effort` is a declared `CLI_FLAGS` of Harbor's Copilot CLI agent
(`--effort`, choices `low|medium|high|xhigh|max`), so it is rendered by
`build_cli_flags()` and never goes through the generic passthrough. Extra
kwargs (`max_ai_credits`, ...) follow the `--ak` contract.

### Kwarg sources and precedence

Agent kwargs come from two sources, merged in this precedence order (later
wins):

1. **`DEFAULT_AGENT_KWARGS`** (`reasoning_effort: high`) — the built-in default.
2. **`--ak KEY=VALUE`** at convert time — overrides the default.

```python
final = {**DEFAULT_AGENT_KWARGS, **cli_kwargs}
```

All suites emitted into a single `config.yaml` share the same default and the
same convert-time `--ak` values.

### Kwarg naming: underscores become dashes

Kwargs use **snake_case** (underscores) everywhere in `config.yaml` / `--ak
KEY=VALUE` because Python identifiers and YAML keys cannot contain dashes.
The conversion to Copilot CLI flags is automatic:

- **Generic passthrough** — any kwarg not declared by Harbor is rendered as
  `--kebab-case value` by `CopilotCliMod.build_cli_flags()`
  (`key.replace("_", "-")`): `max_ai_credits=30` → `--max-ai-credits 30`,
  boolean values become a bare flag (`--enable-memory`).
- **Declared flags** — Harbor's `CliFlag`/`EnvVar` descriptors map a kwarg to
  an explicit CLI name, which may differ from the kwarg (`reasoning_effort` →
  `--effort`).

The mapping is one-way (`_` → `-`); there is no reverse lookup from a CLI flag
name to its kwarg.

### Configuring it

**1. At convert time (recommended)** — override the defaults so the generated
`config.yaml` embeds your values:

```bash
uv run --package harbor-bench harbor-bench convert \
  --model claude-sonnet-4 --ak reasoning_effort=low \
  --scan-root plugins --out .harbor --config-out .harbor/config.yaml
```

User-provided kwargs are merged over `DEFAULT_AGENT_KWARGS`, so
`--ak reasoning_effort=low` wins over the `high` default.

**2. Directly in `config.yaml`** — edit the `agents[0].model_name` /
`agents[0].kwargs` keys of the generated file before `harbor run -c config.yaml`.
This is the **only** override that works with `--config`: Harbor rejects
`--model`/`--ak` when `-c/--config` is passed (`--config cannot be combined with
flags mode options`).

**3. CLI flags (no `--config`)** — when compiling tasks from flags instead of a
config file, pass them directly to `harbor run`:

```bash
uv run --package harbor-bench harbor \
  --agent harbor_bench.agents.copilot_cli_mod:CopilotCliMod \
  --model gpt-5.6-luna --ak reasoning_effort=high ...
```

## evals.json schema

`evals/evals.json` is the unmodified agentskills.io document. It contains the
skill name and eval cases only:

```json
{
  "skill_name": "generate-backend-tests",
  "evals": [
    {
      "id": 1,
      "name": "optional-name",
      "prompt": "...",
      "expected_output": "...",
      "expectations": ["..."],
      "files": ["fixtures/seed.csv"]
    }
  ]
}
```

`convert` embeds the eval ID in every task directory and Harbor task name
(`<skill>-<id>-<name>`), so re-running `convert` produces exactly the tasks
represented by the current evals, removes stale tasks, and never overwrites job
results or the generated config. Conversion defaults such as the base image,
judge model, timeouts, separate verifier, and artifact list live in code.

The workspace fixture has two layers: the optional `harbor/workspace/` directory
and the per-eval `files` entries. Path collisions between layers are rejected.
Other files under `harbor/` are ignored.

## Build-time setup hook (`prepare.sh`)

The generated `environment/Dockerfile` can run a **prepare.sh** at image build
time to install extra tooling or seed the workspace **before the agent runs**
(and before the git baseline commit, so prepared files are part of the agent's
starting repo). Place a suite-wide script at `harbor/prepare.sh` or a
case-specific script at `harbor/<task-key>/prepare.sh`; the case-specific
script wins. `<task-key>` is the non-empty eval name, or the eval ID when the
case has no name. The selected script is copied into the workspace as
`prepare.sh`; a fixture with that name is rejected rather than silently
overwritten:

```sh
RUN if [ -f /workspace/prepare.sh ]; then \
        bash /workspace/prepare.sh; \
    fi
```

### Deterministic git baseline

Every generated `environment/Dockerfile` creates a git baseline commit so the
agent can diff its own edits. The commit uses a fixed repository-local identity
(`user.name harbor-bench`, `user.email harbor-bench@pagopa.invalid`) — the base
image's global git config is never touched — and image construction **fails
visibly** when `git init` or the baseline commit fails (no `|| true`), so every
environment starts from a valid baseline and a clean worktree.

## RewardKit LLM judge

Grading uses **RewardKit** — Harbor's official verifier package
(`harbor-rewardkit` on PyPI) — configured declaratively in `tests/quality.toml`
instead of a hand-rolled `judge.py`. `convert` renders a judge header
(`[judge]`: model + evidence files, `[scoring]`: gate) and one binary
`[[criterion]]` per `expected_output` / `expectations` entry, reading the
agentskills.io rubric from `evals.json` (see the `quality-header.toml`
template). `tests/test.sh` runs the mechanical checks (F1 skill load + invoke
proof) and, when a judge token is available, invokes
`uvx --from harbor-rewardkit==0.2.0 rewardkit /tests` to produce
`reward.json` → `reward.txt`. Env is injected via `[verifier].env`
(`OPENAI_API_BASE=https://api.githubcopilot.com`,
`OPENAI_API_KEY=${COPILOT_GITHUB_TOKEN}`,
`LITELLM_DROP_PARAMS=true`,
`LITELLM_ROUTE_ALL_CHAT_OPENAI_TO_RESPONSES=true`).

## Separate verifier environment

The verifier always runs in a **dedicated container**
(`[verifier] environment_mode = "separate"`), so it can never access the skills
injected into the agent or the agent's runtime state. Harbor transfers to the
verifier only what is declared in the task-level `artifacts` list:

```toml
artifacts = [
  { source = "/workspace", exclude = [".git"] },  # agent-produced files (judge packet); skip the git baseline
  "/logs/agent/copilot-cli.jsonl",    # agent transcript (F1 skill proof)
  "/logs/agent/trajectory.json",      # ATIF trajectory (RewardKit process criteria)
]
```

The verifier image is built from the generated `tests/Dockerfile` (ubuntu +
uv + python; `tests/` is NOT uploaded at runtime). The converter always emits
this separate-verifier setup and the generated artifact list.

## Skill eval data and git sources

Harbor injects the skills listed in the agent's `skills:` (or `--skill`) **as-is**:
`evals.json` — which contains the eval cases and their expected outputs — is part
of every skill directory. When a skill is loaded from the local workspace the
checkout may include `evals/`; when it is loaded from a git source
(`--skill https://github.com/pagopa/dx/tree/main/plugins/aiepdf/skills`), the
downloaded skill always ships `evals/` together with the harness material.

Harbor uploads each injected skill to `/harbor/skills/<name>` as-is, regardless
of whether it came from the local workspace or a git source. Consequently,
`evals/evals.json` and the `harbor/` layout remain readable to the agent; an
upload-exclude feature or an explicit request to remove eval data would be
needed to restore that protection.

## Comparing skill versions (workspace vs git)

The eval set is always the current workspace (`convert` generates tasks from
`plugins/**/skills/*/evals/evals.json`). To evaluate an **older skill version**
against the same tasks, inject the skills from a git ref with `--skill`: Harbor
sparse-checks-out only the skills subdir into a per-SHA cache
(`~/.cache/harbor/skills/…`), resolves them by name (last-wins), and the
same raw skill directory is uploaded exactly as for the workspace flow. No
worktree or full-branch staging is needed.

```bash
# 1. Baseline: current workspace skills (named job, stable path)
uv run --package harbor-bench harbor-bench convert \
  --scan-root plugins --out .harbor --config-out .harbor/config.yaml
uv run --package harbor-bench harbor run \
  -c .harbor/config.yaml -y --ae COPILOT_GITHUB_TOKEN=... \
  --jobs-dir runs --job-name skill-workspace

# 2. Same config, skills from git (e.g. main) — pass one URL per plugin to compare
uv run --package harbor-bench harbor run \
  -c .harbor/config.yaml -y --ae COPILOT_GITHUB_TOKEN=... \
  --jobs-dir runs --job-name skill-main \
  --skill https://github.com/pagopa/dx/tree/main/plugins/aiepdf/skills \
  --skill https://github.com/pagopa/dx/tree/main/plugins/tests/skills

# 3. Delta report (score, tokens, cost, duration)
uv run --package harbor-bench harbor-bench report \
  runs/skill-workspace runs/skill-main --report comparison.md
```

The report is rendered as Markdown by default; pass `--format json` for a
machine-readable document. Its `comparison` object is calculated only from
tasks present in both runs, while `summary` contains whole-job totals; each
metric records its population explicitly. Per-task metrics remain keyed by the
metric registry, and run configuration is included. Write it to stdout or
`--report out.json`:

```bash
uv run --package harbor-bench harbor-bench report \
  runs/skill-workspace runs/skill-main \
  --format json --report comparison.json
```

For a browser-friendly report, pass `--format html`. The generated file is
self-contained, so it can be opened locally or attached to a review without a
web server or additional assets:

```bash
uv run --package harbor-bench harbor-bench report \
  runs/skill-workspace runs/skill-main \
  --format html \
  --report comparison.html
open comparison.html
```

The HTML report presents a plain-language verdict, headline score and
success-rate changes, task outcome counts, visual metric bars, and expandable
technical details for each task. Headline comparisons use only tasks present
in both runs, so newly added or removed tasks remain visible without skewing
the verdict. Interrupted Harbor trials that have a `trial.log` but no
`result.json` are shown as `Incomplete` instead of disappearing from the
report. Markdown remains the default for terminal and source-control workflows.

Without `--job-name`/`--jobs-dir`, each run lands in `jobs/<timestamp>/`; the
two `--job-name` flags above give stable, human-readable paths so the `report`
command and `harbor view` always know where the runs live. The full run path is always
`<jobs-dir>/<job-name>/`.

Notes:

- **Reproducibility**: `main` moves between runs. Pin the ref to a tag or full
  commit SHA (`https://github.com/pagopa/dx/tree/<sha>/plugins/…`) so the
  comparison always uses the same skill version. Harbor caches by SHA, so
  re-runs are free.
- **Job names are identifiers**: re-running the same `--job-name` with the same
  config resumes (skipped existing trials); with a different config it errors.
  Always use distinct names for the two versions you are comparing.
- **Additive override**: `--skill` is appended to the config's `skills:` list
  and, per skill name, last-wins — the git skill replaces the workspace one for
  the same name. Pass **every** plugin you want to compare; plugins not passed
  keep the workspace version. (Git URLs must point at the skills root, e.g.
  `plugins/aiepdf/skills`, whose immediate children contain `SKILL.md`.)
- **Delta semantics**: `harbor-bench report <base> <head>` reports
  `head − base`. Each task's `result.json` contributes the verifier rewards
  (`score.<criterion>`), agent input/cache/output tokens, cost (USD), agent,
  total and verifier duration, verifier (judge) tokens, and pass/fail. Missing
  tasks (ran in only one job) are reported as `(only base)` / `(new)`, plus a
  summary with totals/means.
- **Run configuration**: a section lists, for each job, the agent model and
  reasoning effort, the grading (judge) model and effort (from
  `verifier/reward-details.json`), and the version of each injected skill —
  `(local)` for workspace skills, `(git: <org>/<repo>@<sha>)` for skills loaded
  via `harbor run --skill`. For git-loaded skills a ready-to-run `git diff`
  command is printed that compares the local working tree against the tested
  git ref:
  `git -C "$(git rev-parse --show-toplevel)" diff <sha> -- <skill path>`.
- **Token/cost backfill**: GPT runs leave input/cache tokens and cost unset in
  `result.json` (the JSONL stream reports only output tokens). `report`
  backfills them from the trial's raw artifacts when present:
  `agent/copilot/session-store.db` (authoritative per-request usage: input,
  cache read/write, output, reasoning tokens, cost metered via
  `total_nano_aiu` and converted from nano-AIU to USD), falling back to
  `agent/copilot-cli.jsonl` (cost from the `session.usage_checkpoint` event).
  One billion nano-AIU equals one AI credit, and one AI credit is $0.01 USD.
  Step count comes from `agent/trajectory.json`. So the report also shows `reasoning tokens`, `model
requests` and `steps` — and works retroactively on runs that predate the
  backfill.
- **Verifier tokens**: `harbor-rewardkit` 0.2.0 LLM judges do not persist token
  usage. The generated `tests/test.sh` installs a `sitecustomize` shim that
  patches `litellm.acompletion` and tees each judge call's usage into
  `verifier/usage.jsonl` (one line per call); `report` aggregates it into the
  `verifier tokens` row. Runs generated before this shim (or without a judge
  token) show `—`.

### One-command comparison: `harbor-bench compare`

The two-step flow above is what `harbor-bench compare` automates: it converts
the eval set once, runs the same config twice (base skill in the first
`harbor run`, head skill in the second), and writes the delta report — all
under one output directory. The report is `comparison.md` by default; pass
`--format html` or `--format json` to produce `comparison.html` or
`comparison.json`.

```bash
uv run --package harbor-bench harbor-bench compare \
  plugins/aiepdf/skills/dr-blacksmith \
  https://github.com/pagopa/dx/tree/foobar/plugins/aiepdf/skills/dr-blacksmith \
  -t 'dr-blacksmith-*-use-case-*' \
  --format html \
  --token $COPILOT_GITHUB_TOKEN
```

Each skill is a **local path** (a skill dir with `SKILL.md`, or a root whose
immediate children are skill dirs) or a **git source**:
`org/repo[@ref]`, or `https://github.com/org/repo/tree/<ref>/<subdir>` (the
form `harbor run --skill` consumes). The base and head runs happen in sequence
(base first, head second) and `harbor run`'s output is streamed straight to the
terminal, so you see live progress for each run. Only the task-name filter
differs from the manual flow: without `-t/--task-pattern`, `compare` derives
`--task-glob`s from the two skill names (`<name>-*`), falling back to all
generated tasks when no name is derivable.

Flags:

| Flag | Meaning |
| --- | --- |
| `-t, --task-pattern PATTERN` | run only tasks matching `PATTERN` (glob); repeatable |
| `--scan-root DIR` | evals.json scan root (default: `plugins`) |
| `--out DIR` | convert output dir (default: `.harbor`) |
| `--runs-dir DIR` | parent dir for the two job runs (default: `runs`) |
| `--run-id ID` | stable run id (default: a fresh timestamp) |
| `--task-glob GLOBS` | explicit task globs, space-separated; used only when `-t` is not given |
| `--model MODEL` | Copilot model passed to the agent (default: `gpt-5.6-luna`) |
| `--environment TYPE` | `docker` (default) or `apple-container` |
| `--n-concurrent N` | `n_concurrent_trials` (default: `4`) |
| `--format FORMAT` | report format: `markdown` (default), `html`, or `json` |
| `--token TOKEN` | GitHub token passed to the agent (`--ae COPILOT_GITHUB_TOKEN=...`) |

## Comparing with vs without skill (baseline)

To measure what the skill actually contributes, run the same eval set twice —
once with the injected skills and once without (`--without-skill` omits the
skills from the agent config **and** disables the `SKILL_EVAL_ENFORCE_SKILL_USE`
gate in the verifier, so cases are not marked as failed just because the agent
did not invoke a skill). Generate a dedicated baseline config, run both jobs
with distinct names, then generate a report with `report`:

```bash
# 1. Configs: with skills (default) and without (baseline)
uv run --package harbor-bench harbor-bench convert \
  --scan-root plugins --out .harbor \
  --config-out .harbor/config.yaml
uv run --package harbor-bench harbor-bench convert \
  --scan-root plugins --out .harbor-baseline \
  --config-out .harbor-baseline/config.yaml --without-skill

# 2. Run both (distinct job names — same name with a different config errors)
uv run --package harbor-bench harbor run \
  -c .harbor/config.yaml -y --ae COPILOT_GITHUB_TOKEN=... \
  --jobs-dir runs --job-name with-skill
uv run --package harbor-bench harbor run \
  -c .harbor-baseline/config.yaml -y --ae COPILOT_GITHUB_TOKEN=... \
  --jobs-dir runs --job-name without-skill

# 3. Delta report: with-skill − without-skill (score, tokens, cost, duration)
uv run --package harbor-bench harbor-bench report \
  runs/without-skill runs/with-skill --report comparison.md
```

Keep the two configs otherwise identical (same `--model`, same `--ak`) so the
delta isolates the skill effect. In the run configuration section of the report
the skills row shows `—` for the baseline job.

## Gotchas (validated)

- Base image must be **glibc** (ubuntu/debian), never Alpine — the Copilot CLI
  binary is a Node SEA for glibc.
- Pin `harbor==0.22.0` — the Harbor API is under fast weekly evolution.
- Eval data (`evals/`, `harbor/`, `.git`) remains visible inside the agent
  container because Harbor uploads the skill dir as-is. This residual
  visibility risk is accepted until Harbor provides an upload-exclude feature
  or the benchmark explicitly changes its data-handling contract.
- CI needs `-y` to auto-confirm host env passthrough.
