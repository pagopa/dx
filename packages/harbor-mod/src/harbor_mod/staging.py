"""Stage skill directories for Harbor skill injection, excluding eval data.

Harbor's agent ``skills`` uploads the whole directory into the agent container;
injecting the raw skill dir would leak ``evals/`` (the expected outputs) to the
agent under evaluation. This module copies each skill to a staging dir WITHOUT
``evals/``, ``harbor/``, and ``.git``.
"""

from __future__ import annotations

import shutil
from pathlib import Path

_IGNORED = shutil.ignore_patterns("evals", "harbor", ".git", "__pycache__")


def stage_skill(skill_dir: Path, stage_root: Path) -> Path:
    """Stage one skill into ``<stage_root>/<basename>`` (no evals/.git/harbor).

    Returns the staged skill path. Recreates the destination if present.
    """
    src = Path(skill_dir)
    if not src.is_dir():
        raise FileNotFoundError(f"skill not found: {src}")
    dst = stage_root / src.name
    if dst.exists():
        shutil.rmtree(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, dst, ignore=_IGNORED, symlinks=True)
    return dst


def stage_skills(skill_dirs: list[Path], stage_root: Path) -> list[Path]:
    """Stage several skills; returns one staged path per input."""
    return [stage_skill(s, stage_root) for s in skill_dirs]
