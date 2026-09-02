# harbor-bench

harbor-bench is the PagoPA Harbor CLI for skill benchmarks. It turns a skill's
agentskills.io `evals/evals.json` into runnable Harbor tasks, runs a Copilot
CLI agent on them, and compares metrics across runs — so you can validate a
skill as you write it and catch regressions when you change it.

The CLI provides three commands:

1. **`convert`** — generates the Harbor task structures plus a ready-to-run
   `config.yaml` from each skill's `evals/evals.json`. `evals.json` stays the
   single source of truth: re-running `convert` regenerates tasks, removes
   stale ones, and never overwrites job results.
2. **`report`** — reads two Harbor job directories and prints a per-task delta
   report (score, tokens, cost, steps, duration) with the run configuration.
3. **`compare`** — the everyday flow: runs the same eval set against two skill
   versions and writes the delta report for you.

This README covers everyday usage. Environment selection, run tuning,
performance, skill authoring and report internals live in
[Advanced usage](docs/advanced-usage.md).

## Install

The CLI installs and runs from this workspace through `uv` — no virtualenv
activation needed:

```bash
mise run install
uv run --package harbor-bench harbor-bench --help
```

## Quick start: compare two skill versions

The everyday flow is measuring a change: `compare` converts the skill's evals
once and runs them twice — a base version and a head version — then writes the
delta report (score, tokens, cost, steps, duration). No manual `convert` /
`harbor run` steps needed.

Compare the workspace version of a skill against the same skill at a git ref:

```bash
uv run --package harbor-bench harbor-bench compare \
  plugins/aiepdf/skills/dr-blacksmith \
  https://github.com/pagopa/dx/tree/main/plugins/aiepdf/skills/dr-blacksmith \
  -t 'dr-blacksmith-*-use-case-*' \
  --format html \
  --token $COPILOT_GITHUB_TOKEN
```

The `COPILOT_GITHUB_TOKEN` token can be set in the environment as well
before running the `compare` command:

```sh
export COPILOT_GITHUB_TOKEN=$(gh auth token)
```

- The two arguments are a **local path** (a skill directory, or a root whose
  immediate children are skill dirs) and/or a **git source**
  (`org/repo[@ref]`, or the
  `https://github.com/org/repo/tree/<ref>/<subdir>` form). Pin the git ref to
  a tag or commit SHA — `main` moves between runs.
- `-t/--task-pattern` is a glob over task names; without it, only the tasks
  matching the two skill names are run.
- The two runs execute in sequence (base first, then head) with live output in
  the terminal; their job directories are `runs/<run-id>/base` and
  `runs/<run-id>/head`. The delta report is written next to them at
  `runs/<run-id>/comparison.md`; `--format html|json` changes the extension.
  `--runs-dir` / `--run-id` relocate the folder.
- On Apple silicon macOS 26+ add `--environment apple-container` to run
  through Apple's `container` CLI instead of Docker — see [Apple
  Container](docs/advanced-usage.md#apple-container) for the host requirements
  and one-time bootstrap.
- Full flag reference and semantics: [One-command comparison: `harbor-bench
compare`](docs/advanced-usage.md#one-command-comparison-harbor-bench-compare).

### Report on runs you already executed

If the two versions were run by hand (or you want to re-report), `report`
diffs two job directories with the same output options:

```bash
uv run --package harbor-bench harbor-bench report \
  runs/skill-workspace runs/skill-main --report comparison.md
```

`report <base> <head>` reports `head − base` per task.

### Run a single version (no comparison)

When you don't need a delta — validating a skill or reproducing one run —
convert and run manually:

```bash
uv run --package harbor-bench harbor-bench convert \
  --scan-root plugins --out .harbor --config-out .harbor/config.yaml

uv run --package harbor-bench harbor run \
  -c .harbor/config.yaml -y --ae COPILOT_GITHUB_TOKEN=...
```

`convert` scans `plugins/**/skills` by default (set `--scan-root`). The token
passed with `--ae` authenticates the agent and, when present, the LLM judge;
`-y` auto-confirms host env passthrough (CI needs it). Add `--jobs-dir runs
--job-name <name>` to land the run in a stable `runs/<name>/` directory,
otherwise it goes to `jobs/<timestamp>/`.

## Going further

Everything beyond the quick start is documented in
[docs/advanced-usage.md](docs/advanced-usage.md):

- [Apple Container](docs/advanced-usage.md#apple-container) — run the same
  images through Apple's `container` CLI instead of a Docker daemon.
- [Running a subset of tasks](docs/advanced-usage.md#running-a-subset-of-tasks) —
  select tasks with glob filters in `config.yaml`.
- [Agent model and reasoning effort](docs/advanced-usage.md#agent-model-and-reasoning-effort) —
  defaults, `--ak` kwargs and precedence.
- [Reusing the environment image (faster startup)](docs/advanced-usage.md#reusing-the-environment-image-faster-startup) —
  skip repeated image builds for faster runs.
- [Authoring skills for the benchmark](docs/advanced-usage.md#authoring-skills-for-the-benchmark) —
  `evals.json`, workspace fixtures, `prepare.sh`, and how grading (RewardKit)
  and the verifier work.
- [Skill eval data and git sources](docs/advanced-usage.md#skill-eval-data-and-git-sources) —
  eval-data visibility inside the agent container.
- [Comparing skill versions (workspace vs git)](docs/advanced-usage.md#comparing-skill-versions-workspace-vs-git) —
  the manual `--skill` flow, job naming and report semantics.
- [Baseline: with vs without the skill](docs/advanced-usage.md#baseline-with-vs-without-the-skill) —
  isolate the skill's contribution.
- [Gotchas](docs/advanced-usage.md#gotchas) — base-image, version and CI caveats.
