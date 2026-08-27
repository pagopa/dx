# harbor-mod

PagoPA Harbor extensions (private, at least for now):

1. **Custom Copilot CLI agent** — `harbor_mod.agents.CopilotCliMod` forwards
   arbitrary `--ak key=value` kwargs verbatim to the Copilot CLI
   (`--kebab-case value`), covering `--max-ai-credits`, `--enable-memory`,
   `--model`, etc. It also fixes skill injection (copies to
   `~/.copilot/skills/`, where Copilot discovers them).
2. **`harbor-mod convert`** — a runtime converter that reads the agentskills.io
   `evals/evals.json` files in the plugins and generates **on the fly** the
   Harbor task structures (task.toml, instruction.md, environment/Dockerfile +
   fixtures, tests/test.sh + single-call LLM judge, solution/solve.sh) plus a
   ready-to-run `config.yaml`, so `harbor run -c config.yaml` finds everything.

The goal of `convert` is to avoid refactoring each `evals.json` into the
per-task Harbor config files: `evals.json` stays the source of truth.

## Install

The agent code runs host-side inside the `harbor` process, so `harbor-mod` must
be importable from that same Python environment. Two supported workflows:

**A. uv tool (recommended):**

```bash
uv tool install harbor==0.22.0 --with 'harbor-mod @ /path/to/packages/harbor-mod'
```

**B. PYTHONPATH:**

```bash
PYTHONPATH=/path/to/packages/harbor-mod/src harbor run ...
```

The `convert` command itself only needs Python + the package deps:

```bash
cd packages/harbor-mod && uv sync --extra test
```

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
    "base_image": "ubuntu:24.04",            // glibc required
    "judge_model": "openai/gpt-5.6-luna",    // Responses-capable model
    "timeout_sec": 900,
    "workspace_dir": "harbor/workspace",     // per-skill fixture base layer
    "kwargs": { "reasoning_effort": "high", "max_ai_credits": 30 }
  },
  "evals": [
    {
      "id": 1,
      "name": "optional-name",
      "prompt": "...",
      "expected_output": "...",
      "expectations": ["..."],
      "files": ["fixtures/seed.csv"],        // per-eval files (rel. to skill dir)
      "overlays": ["fixtures/overlay-a"]     // per-eval overlay dirs
    }
  ]
}
```

Layer order: `workspace_dir` → `overlays` → `files`; path collisions between
layers are rejected.

## LLM judge

Each generated task runs a **single-call** LLM judge inside `tests/test.sh`:
`judge.py` reads `tests/rubric.json` (prompt + expected_output + expectations +
judge_model) and the Copilot CLI transcript (`/logs/agent/copilot-cli.txt`),
calls the GitHub Copilot responses endpoint through LiteLLM once, and writes
`reward.txt` (0..1) + `reason.txt`. Env is injected via `[verifier].env`
(`OPENAI_API_BASE=https://api.githubcopilot.com`,
`OPENAI_API_KEY=${COPILOT_GITHUB_TOKEN}`,
`LITELLM_DROP_PARAMS=true`,
`LITELLM_ROUTE_ALL_CHAT_OPENAI_TO_RESPONSES=true`).

## Gotchas (validated)

- Base image must be **glibc** (ubuntu/debian), never Alpine — the Copilot CLI
  binary is a Node SEA for glibc.
- Pin `harbor==0.22.0` — the Harbor API is under fast weekly evolution.
- Skills are staged without `evals/`/`harbor/`/`.git` so the agent cannot read
  the eval expected outputs.
- CI needs `-y` to auto-confirm host env passthrough.
