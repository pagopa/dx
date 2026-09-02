"""Resolve skill arguments (local path or git source) for ``harbor run --skill``.

``harbor-bench compare`` evaluates two versions of the same skill against the
same Harbor eval set: typically the local workspace checkout as one side and a
git source (``org/repo[@ref]`` or a GitHub ``/tree/<ref>/<subdir>`` URL) as the
other. Both are handed to ``harbor run --skill`` — a git source passes through
verbatim, a local path is resolved and validated up front.

This module is the single place that decides what a skill argument means.
:func:`parse_skill` returns a typed :class:`SkillSource` carrying the reference
to hand to ``harbor run --skill`` and the skill name used to narrow the eval
set (:func:`derive_globs`). Local paths are validated up front; git sources are
only validated once :func:`validate_git_source` resolves them against the
remote (a ``compare`` preflight). Nothing here knows about running or
reporting.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

#: Shorthand git source ``org/repo`` or ``org/repo@ref``. Relative local paths
#: that look like ``org/repo`` need a ``./`` prefix to be treated as paths.
_GIT_SHORTHAND = re.compile(r"^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+(@.+)?$")


@dataclass(frozen=True)
class SkillSource:
    """A parsed skill argument: a local path or a git source.

    ``reference`` is what gets passed to ``harbor run --skill``. ``name`` is
    the skill name used to derive the eval-set glob (``<name>-*``); ``None``
    when it cannot be derived (a shorthand git source or a root of skill
    dirs, where the exact skill under test is not knowable).
    """

    value: str
    kind: str  # "local" | "git"
    reference: str
    name: str | None


def is_git_source(value: str) -> bool:
    """Whether a skill argument is a git source rather than a local path."""
    if "://" in value:
        return True
    return _GIT_SHORTHAND.match(value) is not None


def _abs_path(value: str, cwd: Path) -> Path:
    """Expand ``~/`` and resolve relative paths against ``cwd``."""
    if value.startswith("~/"):
        return Path.home() / value[2:]
    path = Path(value)
    return path if path.is_absolute() else cwd / path


def _git_name(value: str) -> str | None:
    """Skill name derived from a GitHub ``/tree/<ref>/<subdir>`` URL.

    The last path segment after the ref (``dr-blacksmith`` in
    ``…/tree/main/plugins/aiepdf/skills/dr-blacksmith``); ``None`` when the URL
    has no meaningful segment (e.g. it points at a skills root). Query and
    fragment parts are ignored.
    """
    segment = value.split("#", 1)[0].split("?", 1)[0]
    segment = segment.rstrip("/").rsplit("/", 1)[-1]
    if not segment or segment == "skills":
        return None
    return segment


def _validate_local_path(path: Path, value: str) -> None:
    """Raise when ``path`` is neither a skill dir nor a root of skill dirs.

    A skill dir contains ``SKILL.md``; a root of skill dirs has at least one
    child directory, each containing ``SKILL.md``. Anything else — an empty
    directory, files-only content, or a child directory without ``SKILL.md`` —
    is rejected.
    """
    if (path / "SKILL.md").is_file():
        return
    child_dirs = [child for child in path.iterdir() if child.is_dir()]
    if not child_dirs:
        raise ValueError(
            f"not a skill dir (SKILL.md) nor a root of skill dirs: {value}"
        )
    for child in child_dirs:
        if not (child / "SKILL.md").is_file():
            raise ValueError(
                f"not a skill dir (SKILL.md) nor a root of skill dirs: {value}"
            )


def validate_git_source(source: SkillSource) -> str | None:
    """Error message when a ``git`` source cannot be resolved to real skills.

    :func:`parse_skill` only recognizes a git source syntactically — the repo,
    the ref, and the skill path under it are unchecked until ``harbor run``
    reaches the source. ``harbor-bench compare`` runs the base job before the
    head one, so an invalid head source would only fail *after* the whole base
    run. This preflight resolves the source with Harbor's own git resolver
    (ref looked up via ``git ls-remote``, commit sparse-checked-out into
    Harbor's skill cache) and validates the resolved directories with Harbor's
    own skill-dir check — the exact steps ``harbor run --skill`` will run. Any
    failure returns an error message; ``None`` means the source is ready to
    run. The cache is keyed by commit SHA, so the fetch is reused when
    ``harbor run`` starts — nothing is downloaded twice.
    """
    if source.kind != "git":
        return None
    try:
        # Lazy import: harbor's git resolver is only needed for git sources.
        from harbor import skills as harbor_skills
    except ImportError as exc:
        return f"cannot validate git source {source.reference!r}: {exc}"
    try:
        resolved = harbor_skills.resolve_skill_sources([source.reference])
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        return str(exc)
    for path in resolved:
        try:
            harbor_skills._find_skill_dirs(path)
        except (FileNotFoundError, ValueError) as exc:
            return str(exc)
    return None


def parse_skill(value: str, cwd: Path) -> SkillSource:
    """Resolve a skill argument into the reference ``harbor run --skill`` needs.

    Git sources (``org/repo[@ref]`` and URLs) pass through verbatim. Local
    paths are made absolute (relative against ``cwd``, ``~/`` against the home
    dir) and validated: the directory must either contain ``SKILL.md`` or be a
    root whose immediate children are skill dirs. Raises ``ValueError`` for a
    missing or malformed local path.
    """
    if is_git_source(value):
        name = _git_name(value) if "://" in value else None
        return SkillSource(value=value, kind="git", reference=value, name=name)
    path = _abs_path(value, cwd)
    if not path.is_dir():
        raise ValueError(f"skill path does not exist: {value} (absolute: {path})")
    _validate_local_path(path, value)
    name = path.name if (path / "SKILL.md").is_file() else None
    return SkillSource(value=value, kind="local", reference=str(path), name=name)


def derive_globs(
    base: SkillSource,
    head: SkillSource,
    task_patterns: tuple[str, ...],
    task_globs: tuple[str, ...],
) -> tuple[str, ...]:
    """The eval-set globs narrowing which generated tasks run.

    Explicit ``-t/--task-pattern`` wins over ``--task-glob`` (``task_globs``),
    which wins over globs derived from the two skill names (``<name>-*``);
    ``("*",)`` (all generated tasks) when no name is derivable. Order is
    preserved and duplicates dropped.
    """
    if task_patterns:
        raw = task_patterns
    elif task_globs:
        raw = task_globs
    else:
        raw = tuple(f"{skill.name}-*" for skill in (base, head) if skill.name)
    if not raw:
        return ("*",)
    seen: list[str] = []
    for glob in raw:
        if glob not in seen:
            seen.append(glob)
    return tuple(seen)
