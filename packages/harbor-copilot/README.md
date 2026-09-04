# harbor-copilot

Custom GitHub Copilot CLI agent for PagoPA skill evaluations — the agent half
of a Harbor benchmark run.

`harbor_copilot.agents.CopilotCliMod` extends Harbor's built-in
`CopilotCli` agent with:

- **generic `--ak` flag passthrough** — any kwarg not declared by Harbor is
  forwarded to the Copilot CLI as `--kebab-case value` (`max_ai_credits=30` →
  `--max-ai-credits 30`; booleans become bare flags);
- **skill registration fix** — injected skills are copied to
  `~/.copilot/skills/`, where Copilot CLI actually discovers personal skills;
- **skip reinstalling the Copilot CLI** when it is already on PATH (no-op when
  the CLI is baked into a reused/prebuilt environment image).

The package also owns the shared metric contract: the metric registry
(`harbor_copilot.metrics`) and the Copilot usage parser
(`harbor_copilot.copilot_usage`) that the agent writes into an
`AgentContext` and the `harbor-bench` app reads back from a trial.

## Load the agent

Reference it in a job `config.yaml`:

```yaml
agents:
  - import_path: harbor_copilot.agents.copilot_cli_mod:CopilotCliMod
    kwargs:
      max_ai_credits: 30
```

or pass it explicitly to `harbor run`:

```bash
uv run --package harbor-bench harbor run \
  --agent harbor_copilot.agents.copilot_cli_mod:CopilotCliMod ...
```

The agent code runs host-side inside the `harbor` process, so `harbor-copilot`
must be importable from that same Python environment — the `harbor-bench`
app depends on this package, and `uv run --package harbor-bench` installs it.

## Install

Workspace member managed by uv. From the repository root:

```bash
mise run install        # uv sync --all-packages
uv run --package harbor-copilot --extra test pytest tests
```

Pin `harbor==0.22.0` — the Harbor agent API is under fast weekly evolution.
