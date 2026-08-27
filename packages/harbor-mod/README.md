# harbor-mod

PagoPA Harbor extensions.

1. **Custom Copilot CLI agent** — `harbor_mod.agents.CopilotCliMod` forwards
   arbitrary `--ak key=value` kwargs verbatim to the Copilot CLI
   (`--kebab-case value`), covering `--max-ai-credits`, `--enable-memory`,
   `--model`, etc. It also fixes skill injection (copies to
   `~/.copilot/skills/`, where Copilot discovers them).
2. **`harbor-mod convert`** — a runtime converter that reads the agentskills.io
   `evals/evals.json` files in the plugins and generates **on the fly** the
   Harbor task structures (task.toml, instruction.md, environment/Dockerfile +
   fixtures, tests/test.sh + RewardKit `tests/quality.toml` judge config,
   solution/solve.sh) plus a ready-to-run `config.yaml`, so
   `harbor run -c config.yaml` finds everything.

The goal of `convert` is to avoid refactoring each `evals.json` into the
per-task Harbor config files: `evals.json` stays the source of truth.

## Install

The agent code runs host-side inside the `harbor` process, so `harbor-mod` must
be importable from that same Python environment. Two supported workflows:

**A. uv tool (recommended):**

```bash
uv tool install harbor==0.22.0 --with 'harbor-mod @ ./packages/harbor-mod'
```

**B. Project venv:**

```bash
cd packages/harbor-mod && uv sync
source .venv/bin/activate
```

`uv sync` installs `harbor-mod` and its deps (`harbor==0.22.0`) into the
package `.venv`, so `harbor-mod` and `harbor` are both on `PATH` while the venv
is active. The `convert` command only needs this venv; add `--extra test` to
also install pytest for the test suite.

## Workflow

```bash
# 1. convert evals.json -> Harbor tasks + config.yaml
harbor-mod convert --scan-root plugins --out .harbor --config-out .harbor/config.yaml

# 2. run the eval
harbor run -c .harbor/config.yaml -y --ae COPILOT_GITHUB_TOKEN=...
```

`--without-skill` omits the injected skills (baseline comparison). Agent kwargs
can be overridden at convert time with `--ak max_ai_credits=50`.

## Enriched evals.json schema

The base format is the agentskills.io `evals/evals.json`. The optional `harbor`
block adds conversion metadata; `kwargs` follows the `--ak`/`AgentConfig.kwargs`
contract and is passed verbatim:

```jsonc
{
  "skill_name": "generate-backend-tests",
  "harbor": {
    "base_image": "ubuntu:24.04", // glibc required
    "judge_model": "openai/gpt-5.6-luna", // Responses-capable model
    "timeout_sec": 900,
    "workspace_dir": "harbor/workspace", // per-skill fixture base layer
    "kwargs": { "reasoning_effort": "high", "max_ai_credits": 30 },
  },
  "evals": [
    {
      "id": 1,
      "name": "optional-name",
      "prompt": "...",
      "expected_output": "...",
      "expectations": ["..."],
      "files": ["fixtures/seed.csv"], // per-eval files (rel. to skill dir)
      "overlays": ["fixtures/overlay-a"], // per-eval overlay dirs
    },
  ],
}
```

Layer order: `workspace_dir` → `overlays` → `files`; path collisions between
layers are rejected.

## Configuration file overrides

`convert` generates every task config file from a template; the `overrides`
map replaces a generated file with a custom one, either for the whole suite
(`harbor.overrides`) or for a single eval (`evals[].harbor.overrides`). Per-eval
wins over suite; precedence is **per-eval > suite > template**.

Keys are destination paths in the generated task; values are paths relative to
the skill dir (recommended: under `harbor/`, which is excluded from the staged
skill):

```jsonc
{
  "skill_name": "generate-backend-tests",
  "harbor": {
    "overrides": { "tests/quality.toml": "harbor/quality.toml" } // suite-wide
  },
  "evals": [
    {
      "id": 1,
      "prompt": "...",
      "expected_output": "...",
      "harbor": {
        "overrides": {
          "task.toml": "harbor/cases/case1.toml", // full replace of task.toml
          "environment/Dockerfile": "harbor/cases/case1.Dockerfile",
        }
      }
    },
  ],
}
```

Overridable targets: `task.toml`, `environment/Dockerfile`, `.dockerignore`,
`tests/test.sh`, `tests/quality.toml`, `tests/Dockerfile` (separate verifier
mode), `solution/solve.sh`.

An overridden file replaces the generated one **verbatim**; `{{KEY}}`
placeholders are still substituted when present:
`{{TASK_NAME}}`, `{{TASK_DESCRIPTION}}`, `{{TASK_VERSION}}` in `task.toml`,
`{{SKILL_NAME}}` in `test.sh`, `{{JUDGE_MODEL}}` in `quality.toml`.

> `task.toml` is replaced wholesale (full replace): the converter no longer
> injects `[task] name/description/version`, `[verifier]` env, or `artifacts`.
> Your file must be a valid Harbor task.toml (schema 1.4); use the placeholders
> above to keep the per-case identity.

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

By default the verifier runs in a **dedicated container**
(`[verifier] environment_mode = "separate"`), so it can never access the skills
injected into the agent or the agent's runtime state. Harbor transfers to the
verifier only what is declared in the task-level `artifacts` list:

```toml
artifacts = [
  "/workspace",                       # files the agent produced (judge packet)
  "/logs/agent/copilot-cli.jsonl",    # agent transcript (F1 skill proof)
  "/logs/agent/trajectory.json",      # ATIF trajectory (RewardKit process criteria)
]
```

The verifier image is built from the generated `tests/Dockerfile` (ubuntu +
uv + python; `tests/` is NOT uploaded at runtime). Override per skill/eval in
evals.json with `"harbor": { "verifier_mode": "shared", "artifacts": [...] }`
to fall back to the shared verifier (same container as the agent).

## Gotchas (validated)

- Base image must be **glibc** (ubuntu/debian), never Alpine — the Copilot CLI
  binary is a Node SEA for glibc.
- Pin `harbor==0.22.0` — the Harbor API is under fast weekly evolution.
- Skills are staged without `evals/`/`harbor/`/`.git` so the agent cannot read
  the eval expected outputs.
- CI needs `-y` to auto-confirm host env passthrough.
