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

#: Built-in Harbor ``EnvironmentType`` values accepted by
#: ``harbor-mod convert --environment`` and written into ``[environment].type``.
SUPPORTED_ENVIRONMENT_TYPES = ("docker", "apple-container")

#: Environment used when ``--environment`` is not passed. Kept as ``docker``
#: for backward compatibility; pass ``--environment apple-container`` to run
#: trials with Apple Container (requires an Apple-silicon Mac + the ``container``
#: CLI, see the harbor-mod README).
DEFAULT_ENVIRONMENT_TYPE = "docker"


def collect_declared_kwargs(suites: list[tuple[str, dict]]) -> dict:
    """Merge the per-suite ``harbor.kwargs`` into one dict for the agent config.

    All suites emitted into a single Harbor config share one agent, so their
    declared kwargs must be compatible: the same key may only appear with the
    same value. Raises ``ValueError`` listing the conflicting skills and keys
    instead of silently picking one.
    """
    by_key: dict[str, dict[object, list[str]]] = {}
    for skill_name, kwargs in suites:
        for key, value in kwargs.items():
            by_key.setdefault(key, {}).setdefault(value, []).append(skill_name)

    merged: dict = {}
    conflicts: list[str] = []
    for key, values in by_key.items():
        if len(values) > 1:
            rendered = "; ".join(
                f"{value!r} ({', '.join(skills)})"
                for value, skills in sorted(
                    values.items(), key=lambda item: str(item[0])
                )
            )
            conflicts.append(f"  {key}: {rendered}")
        else:
            merged[key] = next(iter(values))
    if conflicts:
        raise ValueError(
            "conflicting harbor.kwargs across skills (declare compatible values "
            "or pass --ak to override):\n" + "\n".join(conflicts)
        )
    return merged


def build_config(
    *,
    tasks_dir: Path,
    skill_dirs: list[Path],
    kwargs: dict | None = None,
    declared_kwargs: dict | None = None,
    without_skill: bool = False,
    model: str | None = DEFAULT_MODEL,
    jobs_dir: Path | None = None,
    n_concurrent_trials: int = 4,
    environment_type: str = DEFAULT_ENVIRONMENT_TYPE,
) -> dict:
    """Build the JobConfig dict for ``harbor run -c config.yaml``.

    ``tasks_dir`` is the directory containing the generated task dirs.
    ``skill_dirs`` are the staged skill directories injected into the agent
    (skipped when ``without_skill=True``). ``kwargs`` are the agent kwargs
    passed verbatim as ``--ak`` (AgentConfig.kwargs). ``declared_kwargs`` are
    the merged ``harbor.kwargs`` collected from the evals files (see
    :func:`collect_declared_kwargs`). Precedence is
    ``DEFAULT_AGENT_KWARGS`` < ``declared_kwargs`` < ``kwargs``.
    ``model`` defaults to ``DEFAULT_MODEL``.
    ``environment_type`` selects the Harbor environment used to run the agent
    and (when separate) the verifier containers; one of
    ``SUPPORTED_ENVIRONMENT_TYPES`` (``docker`` or ``apple-container``).
    """
    if environment_type not in SUPPORTED_ENVIRONMENT_TYPES:
        raise ValueError(
            f"unsupported environment type {environment_type!r}; expected one of "
            + ", ".join(repr(t) for t in SUPPORTED_ENVIRONMENT_TYPES)
        )

    agent: dict = {
        "import_path": "harbor_mod.agents.copilot_cli_mod:CopilotCliMod",
    }
    if not without_skill and skill_dirs:
        agent["skills"] = [str(d) for d in skill_dirs]
    agent["kwargs"] = {
        **DEFAULT_AGENT_KWARGS,
        **(declared_kwargs or {}),
        **(kwargs or {}),
    }
    agent["model_name"] = model or DEFAULT_MODEL

    config: dict = {
        "jobs_dir": str(jobs_dir) if jobs_dir else "jobs",
        "n_attempts": 1,
        "n_concurrent_trials": n_concurrent_trials,
        "environment": {"type": environment_type},
        "agents": [agent],
        "datasets": [{"path": str(tasks_dir)}],
    }
    return config


def write_config(config: dict, output: Path) -> Path:
    """Serialize the JobConfig dict to YAML."""
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(yaml.safe_dump(config, sort_keys=False))
    return output
