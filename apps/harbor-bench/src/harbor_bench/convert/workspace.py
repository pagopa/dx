"""Compose the eval-case fixture files into an ``environment/`` dir.

Each eval case may declare ``files`` in ``evals.json``; ``convert`` stages
them as the task's workspace fixtures (files the agent sees under
``/workspace``). Two rules:

1. Each fixture may be declared only once (a duplicate basename across the
   case's ``files`` is an error — never silently overwrite).
2. ``reserved`` names top-level files the converter writes after staging (the
   generated ``Dockerfile`` / ``.dockerignore``); a fixture colliding with one
   is rejected — customize them via the ``harbor/`` overlay instead.
"""

from __future__ import annotations

import shutil
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path


class WorkspaceError(RuntimeError):
    """Raised when fixture layers collide or a layer is unusable."""


@dataclass
class WorkspaceLayer:
    """One resolved fixture to copy into the environment dir."""

    label: str
    source: Path


def _collect(layers: list[WorkspaceLayer]) -> dict[str, tuple[str, Path]]:
    """Map relative workspace path -> (layer label, source file), rejecting collisions."""
    entries: dict[str, tuple[str, Path]] = {}
    for layer in layers:
        if not layer.source.exists():
            raise WorkspaceError(f"layer '{layer.label}': source not found: {layer.source}")
        rel = Path(layer.source.name)
        key = rel.as_posix()
        if key in entries:
            prev_label, prev_source = entries[key]
            raise WorkspaceError(
                f"workspace path collision: {key} (layer '{layer.label}' from "
                f"{layer.source} vs layer '{prev_label}' from {prev_source})"
            )
        entries[key] = (layer.label, layer.source)
    return entries


def compose_workspace(
    env_dir: Path,
    *,
    files: Sequence[Path] = (),
    reserved: Sequence[str] = (),
) -> list[str]:
    """Copy the eval-case fixture ``files`` into ``env_dir``; return created paths.

    ``env_dir`` is created if missing. Each file lands at its basename inside
    ``env_dir`` and may be declared only once. ``reserved`` names top-level
    files the caller will write after staging (e.g. the generated
    ``Dockerfile``); a fixture colliding with one is rejected rather than
    silently overwritten.
    """
    layers = [WorkspaceLayer(f"file:{f.name}", f) for f in files]

    env_dir.mkdir(parents=True, exist_ok=True)
    entries = _collect(layers)
    reserved_set = set(reserved)
    for key in entries:
        if "/" not in key and key in reserved_set:
            label, source = entries[key]
            raise WorkspaceError(
                f"fixture path collides with a generated environment file: "
                f"{key} (layer '{label}' from {source}); use the harbor/ "
                f"overlay to customize generated files instead"
            )
    created: list[str] = []
    for rel, (_, source) in sorted(entries.items()):
        target = env_dir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        created.append(rel)
    return created
