"""Emit a ready-to-run Harbor ``config.yaml`` (JobConfig schema)."""

from __future__ import annotations

from pathlib import Path

import yaml


def build_config(
    *,
    tasks_dir: Path,
    skill_dirs: list[Path],
    kwargs: dict | None = None,
    without_skill: bool = False,
    model: str | None = None,
    jobs_dir: Path | None = None,
    n_concurrent_trials: int = 4,
) -> dict:
    """Build the JobConfig dict for ``harbor run -c config.yaml``.

    ``tasks_dir`` is the directory containing the generated task dirs.
    ``skill_dirs`` are the staged skill directories injected into the agent
    (skipped when ``without_skill=True``). ``kwargs`` are the agent kwargs
    passed verbatim as ``--ak`` (AgentConfig.kwargs).
    """
    agent: dict = {
        "import_path": "harbor_mod.agents.copilot_cli_mod:CopilotCliMod",
    }
    if not without_skill and skill_dirs:
        agent["skills"] = [str(d) for d in skill_dirs]
    if kwargs:
        agent["kwargs"] = dict(kwargs)
    if model:
        agent["model_name"] = model

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
