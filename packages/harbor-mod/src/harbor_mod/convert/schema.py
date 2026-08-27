"""Enriched ``evals.json`` schema (agentskills.io format + optional metadata).

The base format is the agentskills.io ``evals/evals.json`` contract; the
optional ``harbor`` top-level block adds the metadata ``convert`` needs to
build a runnable Harbor task (base image, judge model, agent kwargs, workspace
directory). ``kwargs`` here is the ``--ak``/``AgentConfig.kwargs`` contract and
is passed verbatim to the agent.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, model_validator


class HarborMeta(BaseModel):
    """Optional per-skill Harbor evaluation metadata (enriches evals.json)."""

    model_config = ConfigDict(extra="forbid")

    base_image: str = "ubuntu:24.04"
    judge_model: str = "openai/gpt-5.6-luna"
    timeout_sec: float = 900.0
    workspace_dir: str | None = None
    kwargs: dict[str, object] = Field(default_factory=dict)
    verifier_mode: str = "separate"
    artifacts: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _validate_verifier_mode(self) -> "HarborMeta":
        if self.verifier_mode not in ("separate", "shared"):
            raise ValueError(
                f"verifier_mode must be 'separate' or 'shared', got: {self.verifier_mode!r}"
            )
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


def _assert_safe_rel(path: str) -> None:
    """Reject absolute paths and ``..`` escapes (container workspace safety)."""
    p = Path(path)
    if p.is_absolute() or ".." in p.parts:
        raise ValueError(f"unsafe relative path: {path!r}")


def resolve_eval_paths(
    evals_file: EvalsFile, skill_dir: Path
) -> dict[int, dict[str, list[Path]]]:
    """Resolve per-eval files/overlays to absolute paths within the skill dir.

    Returns ``{eval_id: {"files": [Path...], "overlays": [Path...]}}``.
    Raises ``ValueError`` for unsafe or missing paths.
    """
    resolved: dict[int, dict[str, list[Path]]] = {}
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
        resolved[case.id] = {"files": files, "overlays": overlays}
    return resolved
