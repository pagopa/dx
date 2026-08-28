"""Enriched ``evals.json`` schema (agentskills.io format + optional metadata).

The base format is the agentskills.io ``evals/evals.json`` contract; the
optional ``harbor`` top-level block adds the metadata ``convert`` needs to
build a runnable Harbor task (base image, judge model, agent kwargs, workspace
directory). ``kwargs`` here is the ``--ak``/``AgentConfig.kwargs`` contract and
is passed verbatim to the agent.
"""

from __future__ import annotations

from pathlib import Path
from typing import TypedDict

from pydantic import BaseModel, ConfigDict, Field, model_validator

from harbor_mod.task_shape import OVERRIDABLE_TARGETS


def _assert_safe_rel(path: str) -> None:
    """Reject absolute paths and ``..`` escapes (container workspace safety)."""
    p = Path(path)
    if p.is_absolute() or ".." in p.parts:
        raise ValueError(f"unsafe relative path: {path!r}")


def _validate_overrides(overrides: dict[str, str]) -> dict[str, str]:
    """Check override map keys are known targets and values are safe paths."""
    for target, rel in overrides.items():
        if target not in OVERRIDABLE_TARGETS:
            allowed = ", ".join(sorted(OVERRIDABLE_TARGETS))
            raise ValueError(
                f"unknown override target {target!r} (allowed: {allowed})"
            )
        _assert_safe_rel(rel)
    return overrides


def _validate_prepare_script(value: str | None) -> str | None:
    """A ``prepare_script`` is a safe relative path (or ``None``)."""
    if value:
        _assert_safe_rel(value)
    return value


class HarborMeta(BaseModel):
    """Optional per-skill Harbor evaluation metadata (enriches evals.json)."""

    model_config = ConfigDict(extra="forbid")

    base_image: str = "ubuntu:24.04"
    judge_model: str = "openai/gpt-5.6-luna"
    timeout_sec: float = 900.0
    workspace_dir: str | None = None
    prepare_script: str | None = None
    kwargs: dict[str, object] = Field(default_factory=dict)
    verifier_mode: str = "separate"
    artifacts: list[str] = Field(default_factory=list)
    overrides: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validate_verifier_mode(self) -> "HarborMeta":
        if self.verifier_mode not in ("separate", "shared"):
            raise ValueError(
                f"verifier_mode must be 'separate' or 'shared', got: {self.verifier_mode!r}"
            )
        return self

    @model_validator(mode="after")
    def _check_overrides(self) -> "HarborMeta":
        _validate_overrides(self.overrides)
        return self

    @model_validator(mode="after")
    def _check_prepare_script(self) -> "HarborMeta":
        _validate_prepare_script(self.prepare_script)
        return self


class EvalHarborMeta(BaseModel):
    """Per-eval Harbor metadata (config overrides + prepare_script hook)."""

    model_config = ConfigDict(extra="forbid")

    overrides: dict[str, str] = Field(default_factory=dict)
    prepare_script: str | None = None

    @model_validator(mode="after")
    def _check_overrides(self) -> "EvalHarborMeta":
        _validate_overrides(self.overrides)
        return self

    @model_validator(mode="after")
    def _check_prepare_script(self) -> "EvalHarborMeta":
        _validate_prepare_script(self.prepare_script)
        return self


class EvalCase(BaseModel):
    """One test case from the agentskills.io evals.json format."""

    model_config = ConfigDict(extra="forbid")

    id: int
    name: str | None = None
    prompt: str
    expected_output: str
    expectations: list[str] = Field(default_factory=list)
    files: list[str] = Field(default_factory=list)
    overlays: list[str] = Field(default_factory=list)
    harbor: EvalHarborMeta = Field(default_factory=EvalHarborMeta)


class EvalsFile(BaseModel):
    """Top-level evals.json document."""

    model_config = ConfigDict(extra="forbid")

    skill_name: str
    harbor: HarborMeta = Field(default_factory=HarborMeta)
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
    overlays: list[Path]
    overrides: dict[str, Path]
    prepare_script: Path | None


def resolve_eval_paths(
    evals_file: EvalsFile, skill_dir: Path
) -> dict[int, ResolvedEvalPaths]:
    """Resolve per-eval files/overlays/overrides/prepare_script to absolute
    paths within the skill dir.

    Returns ``{eval_id: {"files": [Path...], "overlays": [Path...],
    "overrides": {target: Path}, "prepare_script": Path | None}}``. Overrides
    are the suite-level ``harbor.overrides`` map merged with the per-eval
    ``evals[].harbor.overrides`` map (per-eval wins on key collision).
    ``prepare_script`` is the per-eval ``evals[].harbor.prepare_script`` when
    set, otherwise the suite-level ``harbor.prepare_script``. Raises
    ``ValueError`` for unsafe or missing paths.
    """
    resolved: dict[int, ResolvedEvalPaths] = {}
    for case in evals_file.evals:
        files: list[Path] = []
        for rel in case.files:
            _assert_safe_rel(rel)
            path = (skill_dir / rel).resolve()
            if not path.is_file():
                raise ValueError(
                    f"eval {case.id}: file not found: {rel} (resolved to {path})"
                )
            files.append(path)
        overlays: list[Path] = []
        for rel in case.overlays:
            _assert_safe_rel(rel)
            path = (skill_dir / rel).resolve()
            if not path.is_dir():
                raise ValueError(
                    f"eval {case.id}: overlay dir not found: {rel} (resolved to {path})"
                )
            overlays.append(path)
        merged_overrides = dict(evals_file.harbor.overrides)
        merged_overrides.update(case.harbor.overrides)
        overrides: dict[str, Path] = {}
        for target, rel in merged_overrides.items():
            path = (skill_dir / rel).resolve()
            if not path.is_file():
                raise ValueError(
                    f"eval {case.id}: override {target!r} not found: "
                    f"{rel} (resolved to {path})"
                )
            overrides[target] = path
        prepare_script: Path | None = None
        prepare_rel = case.harbor.prepare_script or evals_file.harbor.prepare_script
        if prepare_rel:
            _assert_safe_rel(prepare_rel)
            path = (skill_dir / prepare_rel).resolve()
            if not path.is_file():
                raise ValueError(
                    f"eval {case.id}: prepare_script not found: {prepare_rel} "
                    f"(resolved to {path})"
                )
            prepare_script = path
        resolved[case.id] = {
            "files": files,
            "overlays": overlays,
            "overrides": overrides,
            "prepare_script": prepare_script,
        }
    return resolved
