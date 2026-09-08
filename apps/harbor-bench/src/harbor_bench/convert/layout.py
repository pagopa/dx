"""Discover the on-disk ``harbor/`` layout used by the task converter."""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .schema import EvalCase


def task_key(case: EvalCase) -> str:
    """Return the on-disk key for an eval case."""
    name = case.name.strip() if case.name is not None else ""
    return name or str(case.id)


def _resolve_within_skill(skill_dir: Path, relative: Path) -> Path:
    """Resolve a layout path and reject paths outside the skill directory."""
    root = skill_dir.resolve()
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError(f"unsafe relative path: {relative!s}")

    resolved = (root / relative).resolve()
    if not resolved.is_relative_to(root):
        raise ValueError(f"path escapes skill directory: {relative!s}")
    return resolved


def discover_workspace_dir(skill_dir: Path) -> Path | None:
    """Return ``harbor/workspace`` when it is a directory."""
    workspace_dir = _resolve_within_skill(skill_dir, Path("harbor/workspace"))
    if not workspace_dir.exists():
        return None
    if not workspace_dir.is_dir():
        raise ValueError(
            f"harbor/workspace must be a directory (resolved to {workspace_dir})"
        )
    return workspace_dir


def discover_environment_overrides(skill_dir: Path) -> Path | None:
    """Return ``harbor/environment.toml`` when the skill declares one.

    The optional file carries per-skill ``[environment]`` overrides (mcp
    servers, env templates, network policy) that ``convert`` deep-merges into
    every generated task of the skill, on top of the converter defaults.
    """
    overrides_file = _resolve_within_skill(skill_dir, Path("harbor/environment.toml"))
    if not overrides_file.exists():
        return None
    if not overrides_file.is_file():
        raise ValueError(
            "harbor/environment.toml must be a file "
            f"(resolved to {overrides_file})"
        )
    return overrides_file


def discover_instruction_append(skill_dir: Path, case: EvalCase) -> Path | None:
    """Return ``harbor/<task-key>/instruction.append.md`` when the skill declares one.

    The optional per-case file holds deterministic "user answers" / scenario
    context appended to the generated ``instruction.md`` after the eval prompt,
    for evals whose rubric assumes an interactive user (e.g. the agent must ask
    for a destination before publishing). Keeping it in the skill's ``harbor/``
    layout means ``evals.json`` stays the unmodified agentskills.io document.
    """
    key = task_key(case)
    if key == "workspace":
        raise ValueError("eval name 'workspace' is reserved for harbor/workspace")
    append_file = _resolve_within_skill(
        skill_dir, Path("harbor") / key / "instruction.append.md"
    )
    if not append_file.exists():
        return None
    if not append_file.is_file():
        raise ValueError(
            f"instruction.append.md must be a file "
            f"(resolved to {append_file})"
        )
    return append_file


def discover_prepare_script(skill_dir: Path, case: EvalCase) -> Path | None:
    """Return the case-specific or suite-wide on-disk prepare script."""
    key = task_key(case)
    if key == "workspace":
        raise ValueError("eval name 'workspace' is reserved for harbor/workspace")

    candidates = (
        Path("harbor") / key / "prepare.sh",
        Path("harbor/prepare.sh"),
    )
    for relative in candidates:
        prepare_script = _resolve_within_skill(skill_dir, relative)
        if not prepare_script.exists():
            continue
        if not prepare_script.is_file():
            raise ValueError(
                f"prepare script must be a file (resolved to {prepare_script})"
            )
        return prepare_script
    return None
