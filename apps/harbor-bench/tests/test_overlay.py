"""Tests for the skill ``harbor/`` overlay: a pure replace-or-add overlay over
the generated task tree (discovery, per-task scoping, plan-time validation)."""

from __future__ import annotations

from pathlib import Path

import pytest

from harbor_bench.convert.overlay import (
    OverlayError,
    discover_overlays,
    validate_overlays,
)


def write(skill: Path, *parts: str, content: str = "") -> Path:
    path = skill.joinpath("harbor", *parts)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    return path


def test_missing_harbor_dir_is_an_empty_overlay(tmp_path: Path):
    skill = tmp_path / "skill"
    skill.mkdir()
    overlays = discover_overlays(skill, task_dirs={"skill-1-case-one"})
    assert overlays.suite == {}
    assert overlays.per_task == {}


def test_suite_overlay_collects_files_relative_to_harbor(tmp_path: Path):
    skill = tmp_path / "skill"
    generated = write(skill, "tests", "quality.toml", content="q")
    context = write(skill, "environment", "prepare.sh", content="p")
    data = write(skill, "environment", "data", "seed.csv", content="d")
    top = write(skill, "extra.txt", content="x")  # added at task root

    overlays = discover_overlays(skill, task_dirs={"skill-1-case-one"})
    assert overlays.suite == {
        "tests/quality.toml": generated.resolve(),
        "environment/prepare.sh": context.resolve(),
        "environment/data/seed.csv": data.resolve(),
        "extra.txt": top.resolve(),
    }
    assert overlays.per_task == {}


def test_per_task_overlay_is_keyed_by_generated_task_dir(tmp_path: Path):
    skill = tmp_path / "skill"
    write(skill, "environment", "Dockerfile", content="suite")
    task = write(
        skill,
        "skill-1-case-one",
        "task.toml",
        content="[agent]\ntimeout_sec = 1\n",
    )
    task_ctx = write(skill, "skill-2-case-two", "environment", "data.txt", content="2")

    overlays = discover_overlays(
        skill, task_dirs={"skill-1-case-one", "skill-2-case-two"}
    )
    assert overlays.per_task == {
        "skill-1-case-one": {"task.toml": task.resolve()},
        "skill-2-case-two": {"environment/data.txt": task_ctx.resolve()},
    }
    assert set(overlays.suite) == {"environment/Dockerfile"}


def test_for_task_merges_with_per_task_winning(tmp_path: Path):
    skill = tmp_path / "skill"
    suite = write(skill, "environment", "Dockerfile", content="suite")
    per = write(skill, "skill-1-case-one", "environment", "Dockerfile", content="per")
    overlays = discover_overlays(skill, task_dirs={"skill-1-case-one"})

    merged = overlays.for_task("skill-1-case-one")
    assert merged == {"environment/Dockerfile": per.resolve()}
    # a task without its own overlay still gets the suite overlay
    merged_other = overlays.for_task("skill-2-case-two")
    assert merged_other == {"environment/Dockerfile": suite.resolve()}


def test_hidden_entries_are_not_overlay(tmp_path: Path):
    skill = tmp_path / "skill"
    write(skill, ".DS_Store", content="junk")
    write(skill, "solution", "solve.sh", content="override")
    write(skill, "environment", ".dockerignore", content="ign")

    overlays = discover_overlays(skill, task_dirs=set())
    assert overlays.suite == {
        "solution/solve.sh": (skill / "harbor" / "solution" / "solve.sh").resolve(),
        "environment/.dockerignore": (
            skill / "harbor" / "environment" / ".dockerignore"
        ).resolve(),
    }


def test_legacy_workspace_dir_is_rejected(tmp_path: Path):
    skill = tmp_path / "skill"
    write(skill, "workspace", "seed.txt", content="legacy fixture")
    with pytest.raises(OverlayError, match="harbor/workspace is no longer"):
        discover_overlays(skill, task_dirs=set())

    # a leftover file named workspace is rejected too (same migration guard)
    skill2 = tmp_path / "skill2"
    write(skill2, "workspace", content="not a dir")
    with pytest.raises(OverlayError, match="harbor/workspace is no longer"):
        discover_overlays(skill2, task_dirs=set())


def test_validate_rejects_suite_level_task_toml(tmp_path: Path):
    skill = tmp_path / "skill"
    write(skill, "task.toml", content="[task]\n")
    overlays = discover_overlays(skill, task_dirs={"skill-1-case-one"})
    with pytest.raises(OverlayError, match="suite-level task.toml override"):
        validate_overlays(overlays)


def test_validate_accepts_replaces_and_adds(tmp_path: Path):
    skill = tmp_path / "skill"
    write(skill, "environment", "Dockerfile", content="docker")  # replace
    write(skill, "environment", "prepare.sh", content="p")  # add
    write(skill, "extra.txt", content="x")  # add anywhere
    write(skill, "skill-1-case-one", "task.toml", content="[task]\n")  # per-task
    overlays = discover_overlays(skill, task_dirs={"skill-1-case-one"})
    # no exception: additions anywhere and per-task task.toml are valid
    validate_overlays(overlays)
    assert "environment/Dockerfile" in overlays.suite
    assert "environment/prepare.sh" in overlays.suite
    assert "extra.txt" in overlays.suite


def test_overlay_source_escaping_harbor_is_rejected(tmp_path: Path):
    skill = tmp_path / "skill"
    outside = tmp_path / "outside"
    outside.mkdir()
    target = outside / "solve.sh"
    target.write_text("outside")
    path = skill / "harbor" / "solution"
    path.mkdir(parents=True)
    (path / "solve.sh").symlink_to(target)

    with pytest.raises(OverlayError, match="escapes the skill's harbor dir"):
        discover_overlays(skill, task_dirs=set())
