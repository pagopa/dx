"""Skill-owned ``harbor/`` overlay over the generated task tree.

A skill customizes what ``convert`` generates through its ``harbor/``
directory, which is a pure **overlay** over the generated task tree. Every file
maps by relative path onto a generated task and is copied there:

* if the path matches a file ``convert`` generates, it **replaces** it
  wholesale (no merge, no append);
* otherwise the file is **added** at that path (directories are created as
  needed) — e.g. ``harbor/environment/prepare.sh`` adds a build-context script
  an overridden ``environment/Dockerfile`` can reference, and any extra file
  under ``harbor/environment/`` becomes part of the container's ``/workspace``
  at runtime.

Two scopes, per-task wins:

* **suite-level**: ``harbor/<rel>`` is applied to *every* generated task of the
  skill (e.g. ``harbor/environment/Dockerfile``).
* **per-task**: ``harbor/<generated-task-dir>/<rel>`` is applied to exactly
  that task (the dir name is the one ``convert`` emits, e.g.
  ``harbor/skill-1-case-one/task.toml``).

Rules, enforced at plan time (before anything is written):

* ``task.toml`` embeds the per-task identity (``[task].name``), so it may only
  be overridden per-task — a suite-level ``harbor/task.toml`` cannot name every
  task and is rejected.
* ``harbor/workspace`` no longer exists (it was the old additive fixture
  layer); put container files under ``harbor/environment/`` instead. A leftover
  ``harbor/workspace`` dir is rejected so an old layout fails loudly instead of
  adding junk at a task ``workspace/`` path.
* An overlay file never silently overwrites a per-eval fixture staged from
  ``evals.json``: only generated files may be replaced, so a collision with a
  case's ``files`` is an error.

Precedence over the whole generated task: converter defaults < per-eval
fixtures (additive) < generated files < suite overlay < per-task overlay <
run-level flags (e.g. ``--without-skill``, re-applied by the converter).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import AbstractSet

from .task import GENERATED_TASK_FILES

#: The suite-level overlay may not replace: the file carries per-task identity.
FORBIDDEN_SUITE_RELPATHS: frozenset[str] = frozenset({"task.toml"})

#: Removed in favor of ``harbor/environment/``; kept as a loud migration guard.
LEGACY_FIXTURE_DIR = "workspace"


class OverlayError(ValueError):
    """A malformed ``harbor/`` overlay (caught at plan time)."""


@dataclass(frozen=True)
class OverlaySet:
    """Overlay files discovered under one skill's ``harbor/`` dir.

    ``suite`` maps task-relative paths to their skill-side sources, applied to
    every task of the skill. ``per_task`` maps a generated task dir name to
    that task's own ``relpath -> source`` map (wins over ``suite``).
    """

    suite: dict[str, Path] = field(default_factory=dict)
    per_task: dict[str, dict[str, Path]] = field(default_factory=dict)

    def for_task(self, task_dir: str) -> dict[str, Path]:
        """The merged overlay dict for one generated task dir (per-task wins)."""
        merged = dict(self.suite)
        merged.update(self.per_task.get(task_dir, {}))
        return merged


def _iter_files(base: Path) -> list[tuple[str, Path]]:
    """Yield (relpath, source) for every file under ``base`` (or ``base`` itself)."""
    if base.is_file():
        return [(base.name, base)]
    return [
        (p.relative_to(base).as_posix(), p)
        for p in sorted(base.rglob("*"))
        if p.is_file()
    ]


def _iter_suite_files(harbor: Path, entry: Path) -> list[tuple[str, Path]]:
    """Suite files under a top-level ``harbor/`` entry, relpath from ``harbor``.

    A file entry contributes just itself; a directory entry contributes its
    files prefixed by the directory name.
    """
    if entry.is_file():
        return [(entry.name, entry)]
    return [
        (f"{entry.name}/{rel}", source)
        for rel, source in _iter_files(entry)
    ]


def _resolve_source(harbor: Path, source: Path) -> Path:
    """Resolve an overlay source, rejecting paths outside ``harbor/``."""
    resolved = source.resolve()
    if not resolved.is_relative_to(harbor.resolve()):
        raise OverlayError(
            f"harbor overlay path escapes the skill's harbor dir: {source}"
        )
    return resolved


def discover_overlays(skill_dir: Path, task_dirs: AbstractSet[str]) -> OverlaySet:
    """Scan a skill's ``harbor/`` dir into suite and per-task overlays.

    ``task_dirs`` are the skill's generated task dir names (``convert``'s
    output names); a top-level directory matching one is a per-task overlay,
    any other entry belongs to the suite-level overlay. ``workspace`` is a
    removed legacy layer and is rejected; hidden entries are ignored.
    """
    harbor = skill_dir / "harbor"
    if not harbor.is_dir():
        return OverlaySet()

    suite: dict[str, Path] = {}
    per_task: dict[str, dict[str, Path]] = {}
    for entry in sorted(harbor.iterdir(), key=lambda p: p.name):
        name = entry.name
        if name.startswith("."):
            continue
        if name == LEGACY_FIXTURE_DIR:
            raise OverlayError(
                f"harbor/workspace is no longer a fixture layer: files under it "
                f"are not copied anywhere. Put container files under "
                f"harbor/environment/ (or remove the directory)."
            )
        if entry.is_dir() and name in task_dirs:
            files = {
                rel: _resolve_source(harbor, source)
                for rel, source in _iter_files(entry)
            }
            if files:
                per_task[name] = files
        else:
            for rel, source in _iter_suite_files(harbor, entry):
                suite[rel] = _resolve_source(harbor, source)
    return OverlaySet(suite=suite, per_task=per_task)


def validate_overlays(overlays: OverlaySet) -> None:
    """Reject the only structurally invalid overlay: a suite-level ``task.toml``.

    Raises :class:`OverlayError` when a suite-level ``harbor/task.toml`` is
    declared (it cannot name every generated task). Anything else is a valid
    replace-or-add; generated-file membership is enforced at generation time.
    """
    for rel in sorted(overlays.suite):
        if rel in FORBIDDEN_SUITE_RELPATHS:
            raise OverlayError(
                f"harbor/{rel}: a suite-level task.toml override is not allowed — "
                "task.toml carries the per-task identity ([task].name). "
                "Place it under harbor/<generated-task-dir>/task.toml instead."
            )
