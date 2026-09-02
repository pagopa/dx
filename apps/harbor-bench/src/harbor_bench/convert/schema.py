"""The agentskills.io ``evals/evals.json`` schema and fixture path resolution."""

from __future__ import annotations

from pathlib import Path
from typing import TypedDict

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .layout import discover_prepare_script


def _assert_safe_rel(path: str) -> None:
    """Reject absolute paths and ``..`` escapes (container workspace safety)."""
    p = Path(path)
    if p.is_absolute() or ".." in p.parts:
        raise ValueError(f"unsafe relative path: {path!r}")


class EvalCase(BaseModel):
    """One test case from the agentskills.io evals.json format."""

    model_config = ConfigDict(extra="forbid")

    id: int
    name: str | None = None
    prompt: str
    expected_output: str
    expectations: list[str] = Field(default_factory=list)
    files: list[str] = Field(default_factory=list)


class EvalsFile(BaseModel):
    """Top-level evals.json document."""

    model_config = ConfigDict(extra="forbid")

    skill_name: str
    evals: list[EvalCase]

    @model_validator(mode="after")
    def _validate_unique_ids(self) -> "EvalsFile":
        ids = [case.id for case in self.evals]
        if len(ids) != len(set(ids)):
            raise ValueError(f"eval ids must be unique, got: {ids}")
        if not self.evals:
            raise ValueError("evals must contain at least one case")
        for case in self.evals:
            if not case.prompt.strip():
                raise ValueError(f"eval {case.id}: prompt is empty")
            if not case.expected_output.strip():
                raise ValueError(f"eval {case.id}: expected_output is empty")
        return self


class ResolvedEvalPaths(TypedDict):
    """Absolute paths for one eval case's fixtures and build hooks."""

    files: list[Path]
    prepare_script: Path | None


def resolve_eval_paths(
    evals_file: EvalsFile, skill_dir: Path
) -> dict[int, ResolvedEvalPaths]:
    """Resolve eval fixture files and on-disk prepare hooks.

    ``files`` are declared by the agentskills.io document. ``prepare_script``
    is discovered from the skill's ``harbor/`` layout. Raises ``ValueError``
    for unsafe or missing paths.
    """
    resolved_skill_dir = skill_dir.resolve()
    resolved: dict[int, ResolvedEvalPaths] = {}
    for case in evals_file.evals:
        files: list[Path] = []
        for rel in case.files:
            _assert_safe_rel(rel)
            path = (resolved_skill_dir / rel).resolve()
            if not path.is_relative_to(resolved_skill_dir):
                raise ValueError(f"unsafe relative path: {rel!r}")
            if not path.is_file():
                raise ValueError(
                    f"eval {case.id}: file not found: {rel} (resolved to {path})"
                )
            files.append(path)
        resolved[case.id] = {
            "files": files,
            "prepare_script": discover_prepare_script(resolved_skill_dir, case),
        }
    return resolved
