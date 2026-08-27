"""Emit a ready-to-run Harbor ``config.yaml`` (JobConfig schema)."""

from __future__ import annotations

from pathlib import Path

import yaml

#: Default Copilot model used to run the agent tasks. Overridable at convert
#: time with ``harbor-mod convert --model ...``.
DEFAULT_MODEL = "gpt-5.6-luna"

#: Default agent kwargs (the ``--ak``/``AgentConfig.kwargs`` contract) merged
#: into the generated config. User-supplied kwargs win over these defaults.
DEFAULT_AGENT_KWARGS: dict = {"reasoning_effort": "high"}


def build_config(
    *,
    tasks_dir: Path,
    skill_dirs: list[Path],
    kwargs: dict | None = None,
    without_skill: bool = False,
    model: str | None = DEFAULT_MODEL,
    jobs_dir: Path | None = None,
    n_concurrent_trials: int = 4,
) -> dict:
    """Build the JobConfig dict for ``harbor run -c config.yaml``.

    ``tasks_dir`` is the directory containing the generated task dirs.
    ``skill_dirs`` are the staged skill directories injected into the agent
    (skipped when ``without_skill=True``). ``kwargs`` are the agent kwargs
    passed verbatim as ``--ak`` (AgentConfig.kwargs); they override the
    ``DEFAULT_AGENT_KWARGS``. ``model`` defaults to ``DEFAULT_MODEL``.
    """
    agent: dict = {
        "import_path": "harbor_mod.agents.copilot_cli_mod:CopilotCliMod",
    }
    if not without_skill and skill_dirs:
        agent["skills"] = [str(d) for d in skill_dirs]
    agent["kwargs"] = {**DEFAULT_AGENT_KWARGS, **(kwargs or {})}
    agent["model_name"] = model or DEFAULT_MODEL

    config: dict = {
        "jobs_dir": str(jobs_dir) if jobs_dir else "jobs",
        "n_attempts": 1,
        "n_concurrent_trials": n_concurrent_trials,
        "environment": {"type": "docker"},
        "agents": [agent],
        "datasets": [{"path": str(tasks_dir)}],
    }
    return config


def write_config(config: dict, output: Path) -> Path:
    """Serialize the JobConfig dict to YAML."""
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(yaml.safe_dump(config, sort_keys=False))
    return output
