"""Compose the task workspace fixture layers into an ``environment/`` dir.

Layers (in order, later wins on non-colliding paths):
1. per-skill ``workspace_dir`` (base layer, relative to the skill dir)
2. per-eval ``overlays`` (directories)
3. per-eval ``files`` (single files)

Any path collision between layers is an error (never silently overwrite).
"""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path


class WorkspaceError(RuntimeError):
    """Raised when fixture layers collide or a layer is unusable."""


@dataclass
class WorkspaceLayer:
    """One resolved fixture layer to copy into the environment dir."""

    label: str
    source: Path


def _rel_entries(source: Path) -> list[Path]:
    if source.is_file():
        return [source]
    return [p for p in source.rglob("*") if p.is_file()]


def _collect(
    layers: list[WorkspaceLayer],
) -> dict[str, tuple[str, Path]]:
    """Map relative workspace path -> (layer label, source file), rejecting collisions."""
    entries: dict[str, tuple[str, Path]] = {}
    for layer in layers:
        if not layer.source.exists():
            raise WorkspaceError(f"layer '{layer.label}': source not found: {layer.source}")
        for source in _rel_entries(layer.source):
            rel = source.relative_to(layer.source) if layer.source.is_dir() else Path(source.name)
            key = rel.as_posix()
            if key in entries:
                prev_label, prev_source = entries[key]
                raise WorkspaceError(
                    f"workspace path collision: {key} (layer '{layer.label}' from "
                    f"{source} vs layer '{prev_label}' from {prev_source})"
                )
            entries[key] = (layer.label, source)
    return entries


def compose_workspace(
    env_dir: Path,
    *,
    workspace_dir: Path | None = None,
    overlays: list[Path] = (),
    files: list[Path] = (),
) -> list[str]:
    """Copy the fixture layers into ``env_dir`` and return created relative paths.

    ``env_dir`` is created if missing. ``workspace_dir`` is the per-skill base
    layer; ``overlays`` are directories; ``files`` are individual files. Each
    relative path may appear in only one layer.
    """
    layers: list[WorkspaceLayer] = []
    if workspace_dir is not None:
        layers.append(WorkspaceLayer("workspace", workspace_dir))
    for overlay in overlays:
        layers.append(WorkspaceLayer(f"overlay:{overlay.name}", overlay))
    for f in files:
        layers.append(WorkspaceLayer(f"file:{f.name}", f))

    env_dir.mkdir(parents=True, exist_ok=True)
    entries = _collect(layers)
    created: list[str] = []
    for rel, (_, source) in sorted(entries.items()):
        target = env_dir / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        created.append(rel)
    return created
