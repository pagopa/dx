"""Tests for the on-disk Harbor skill layout."""

from __future__ import annotations

from pathlib import Path

import pytest

from harbor_bench.convert.layout import (
    discover_prepare_script,
    discover_workspace_dir,
    task_key,
)
from harbor_bench.convert.schema import EvalCase


def make_case(case_id: int = 1, name: str | None = "case-one") -> EvalCase:
    return EvalCase(
        id=case_id,
        name=name,
        prompt="do the thing",
        expected_output="the thing done",
    )


def test_missing_harbor_layout_has_no_hooks_or_workspace(tmp_path: Path):
    skill = tmp_path / "skill"
    skill.mkdir()

    assert discover_prepare_script(skill, make_case()) is None
    assert discover_workspace_dir(skill) is None


def test_workspace_directory_is_discovered_and_files_are_rejected(tmp_path: Path):
    skill = tmp_path / "skill"
    workspace = skill / "harbor" / "workspace"
    workspace.mkdir(parents=True)

    assert discover_workspace_dir(skill) == workspace.resolve()

    file_skill = tmp_path / "file-skill"
    workspace_file = file_skill / "harbor" / "workspace"
    workspace_file.parent.mkdir(parents=True)
    workspace_file.write_text("not a directory")
    with pytest.raises(ValueError, match="must be a directory"):
        discover_workspace_dir(file_skill)

    assert discover_workspace_dir(tmp_path / "absent") is None


def test_suite_prepare_script_applies_to_every_case(tmp_path: Path):
    skill = tmp_path / "skill"
    prepare = skill / "harbor" / "prepare.sh"
    prepare.parent.mkdir(parents=True)
    prepare.write_text("suite")

    assert discover_prepare_script(skill, make_case(1, "one")) == prepare.resolve()
    assert discover_prepare_script(skill, make_case(2, "two")) == prepare.resolve()


def test_case_prepare_script_wins_over_suite_script(tmp_path: Path):
    skill = tmp_path / "skill"
    suite_prepare = skill / "harbor" / "prepare.sh"
    case_prepare = skill / "harbor" / "case-one" / "prepare.sh"
    suite_prepare.parent.mkdir(parents=True)
    suite_prepare.write_text("suite")
    case_prepare.parent.mkdir()
    case_prepare.write_text("case")

    assert discover_prepare_script(skill, make_case()) == case_prepare.resolve()


def test_nameless_case_uses_its_id_as_task_key(tmp_path: Path):
    skill = tmp_path / "skill"
    prepare = skill / "harbor" / "7" / "prepare.sh"
    prepare.parent.mkdir(parents=True)
    prepare.write_text("case")
    case = make_case(7, None)

    assert task_key(case) == "7"
    assert discover_prepare_script(skill, case) == prepare.resolve()


def test_extra_harbor_files_are_ignored(tmp_path: Path):
    skill = tmp_path / "skill"
    harbor = skill / "harbor"
    (harbor / "case-one").mkdir(parents=True)
    (harbor / "task.toml").write_text("ignored")
    (harbor / "case-one" / "notes.md").write_text("ignored")

    assert discover_prepare_script(skill, make_case()) is None


def test_workspace_is_reserved_for_the_fixture_directory(tmp_path: Path):
    with pytest.raises(ValueError, match="reserved"):
        discover_prepare_script(tmp_path, make_case(name="workspace"))


def test_prepare_script_outside_skill_directory_is_rejected(tmp_path: Path):
    skill = tmp_path / "skill"
    outside = tmp_path / "outside.sh"
    outside.write_text("outside")
    prepare = skill / "harbor" / "prepare.sh"
    prepare.parent.mkdir(parents=True)
    prepare.symlink_to(outside)

    with pytest.raises(ValueError, match="escapes skill directory"):
        discover_prepare_script(skill, make_case())
