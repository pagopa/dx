"""Discover ``evals.json`` files and load them with the enriched schema."""

from __future__ import annotations

import json
from pathlib import Path

from .schema import EvalsFile

EVALS_FILENAME = "evals.json"


class DiscoverError(RuntimeError):
    pass


def find_evals_files(root: Path) -> list[Path]:
    """Scan ``<root>/**/skills/*/evals/evals.json`` (sorted, deterministic)."""
    matches = sorted(
        p
        for p in root.rglob(f"*/skills/*/evals/{EVALS_FILENAME}")
        if p.is_file() and ".git" not in p.parts
    )
    return matches


def load_evals_file(path: Path) -> tuple[EvalsFile, Path]:
    """Load an evals.json file and return (model, skill_dir).

    ``skill_dir`` is the directory that contains the skill under test
    (``<skill>/SKILL.md``), derived from the evals.json location.
    """
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise DiscoverError(f"cannot parse {path}: {exc}") from exc
    try:
        evals = EvalsFile.model_validate(data)
    except Exception as exc:
        raise DiscoverError(f"invalid evals.json {path}: {exc}") from exc

    skill_dir = path.parent.parent
    if not (skill_dir / "SKILL.md").is_file():
        raise DiscoverError(
            f"skill dir not found at {skill_dir} (expected SKILL.md next to evals/)"
        )
    return evals, skill_dir
