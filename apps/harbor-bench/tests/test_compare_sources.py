"""Tests for skill source resolution and eval-set glob derivation.

The pure side of ``harbor-bench compare``: what a skill argument means
(:func:`parse_skill`) and how the eval set is narrowed
(:func:`derive_globs`). The orchestration itself is covered by
``tests/test_compare_run.py``.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from harbor_bench.compare.sources import (
    derive_globs,
    is_git_source,
    parse_skill,
)


def make_skill_dir(tmp_path: Path, name: str, *children: str) -> Path:
    """A local skill dir with SKILL.md, or a root of skill dirs."""
    path = tmp_path / name
    path.mkdir(parents=True, exist_ok=True)
    if children:
        for child in children:
            (path / child).mkdir()
            (path / child / "SKILL.md").write_text("# child", encoding="utf-8")
    else:
        (path / "SKILL.md").write_text("# skill", encoding="utf-8")
    return path


# --- is_git_source -------------------------------------------------------


@pytest.mark.parametrize(
    "value",
    [
        "https://github.com/pagopa/dx/tree/main/plugins/aiepdf/skills/dr-blacksmith",
        "https://github.com/org/repo.git@main",
        "pagopa/dx",
        "pagopa/dx@main",
    ],
)
def test_is_git_source_accepts_urls_and_shorthand(value: str):
    assert is_git_source(value)


@pytest.mark.parametrize(
    "value",
    [
        "plugins/aiepdf/skills/dr-blacksmith",
        "./pagopa/dx",
        "skill-name",
        "~/skills/dr-blacksmith",
    ],
)
def test_is_git_source_rejects_local_paths(value: str):
    assert not is_git_source(value)


# --- parse_skill ---------------------------------------------------------


def test_parse_git_url_derives_name(tmp_path: Path):
    source = parse_skill(
        "https://github.com/pagopa/dx/tree/foobar/plugins/aiepdf/skills/dr-blacksmith",
        tmp_path,
    )
    assert source.kind == "git"
    assert source.reference == source.value
    assert source.name == "dr-blacksmith"


def test_parse_git_url_at_skills_root_has_no_name(tmp_path: Path):
    source = parse_skill(
        "https://github.com/pagopa/dx/tree/main/plugins/aiepdf/skills",
        tmp_path,
    )
    assert source.kind == "git"
    assert source.name is None


def test_parse_git_shorthand_has_no_name(tmp_path: Path):
    source = parse_skill("pagopa/dx@main", tmp_path)
    assert source.kind == "git"
    assert source.name is None


def test_parse_local_skill_dir_uses_basename(tmp_path: Path):
    path = make_skill_dir(tmp_path, "dr-blacksmith")
    source = parse_skill(str(path), tmp_path)
    assert source.kind == "local"
    assert source.reference == str(path)
    assert source.name == "dr-blacksmith"


def test_parse_local_relative_path_resolves_against_cwd(tmp_path: Path):
    path = make_skill_dir(tmp_path, "skill-a")
    source = parse_skill("skill-a", tmp_path)
    assert source.reference == str(path.resolve())


def test_parse_local_root_of_skill_dirs_has_no_name(tmp_path: Path):
    path = make_skill_dir(tmp_path, "skills-root", "skill-a", "skill-b")
    source = parse_skill(str(path), tmp_path)
    assert source.kind == "local"
    assert source.name is None


def test_parse_local_missing_path_raises(tmp_path: Path):
    with pytest.raises(ValueError, match="skill path does not exist"):
        parse_skill(str(tmp_path / "missing"), tmp_path)


def test_parse_local_root_with_non_skill_child_raises(tmp_path: Path):
    path = make_skill_dir(tmp_path, "skills-root", "skill-a", "skill-b")
    (path / "skill-b" / "SKILL.md").unlink()
    with pytest.raises(ValueError, match="not a skill dir"):
        parse_skill(str(path), tmp_path)


# --- derive_globs --------------------------------------------------------


def local_skill(tmp_path: Path, name: str):
    path = make_skill_dir(tmp_path, name)
    return parse_skill(str(path), tmp_path)


def test_derive_globs_explicit_patterns_win(tmp_path: Path):
    base = local_skill(tmp_path, "skill-a")
    head = local_skill(tmp_path, "skill-b")
    assert derive_globs(base, head, ("custom-*",), ()) == ("custom-*",)


def test_derive_globs_task_globs_win_over_names(tmp_path: Path):
    base = local_skill(tmp_path, "skill-a")
    head = local_skill(tmp_path, "skill-b")
    assert derive_globs(base, head, (), ("glob-a-*", "glob-b-*")) == (
        "glob-a-*",
        "glob-b-*",
    )


def test_derive_globs_from_skill_names_dedupes(tmp_path: Path):
    base = local_skill(tmp_path, "skill-a")
    head = local_skill(tmp_path, "skill-a")
    assert derive_globs(base, head, (), ()) == ("skill-a-*",)


def test_derive_globs_falls_back_to_all(tmp_path: Path):
    base = parse_skill("pagopa/dx@main", tmp_path)
    head = parse_skill("pagopa/dx@main", tmp_path)
    assert derive_globs(base, head, (), ()) == ("*",)


def test_derive_globs_dedupes_across_sources(tmp_path: Path):
    base = local_skill(tmp_path, "skill-a")
    head = local_skill(tmp_path, "skill-a")
    assert derive_globs(base, head, (), ("skill-a-*", "skill-a-*")) == (
        "skill-a-*",
    )
