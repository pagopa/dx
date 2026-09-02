"""Tests for workspace fixture composition (collision detection)."""

from __future__ import annotations

from pathlib import Path

import pytest

from harbor_bench.convert.workspace import WorkspaceError, compose_workspace


def test_composes_base_and_files(tmp_path):
    env = tmp_path / "env"
    base = tmp_path / "base"
    (base / "sub").mkdir(parents=True)
    (base / "a.txt").write_text("base-a")
    (base / "sub" / "b.txt").write_text("base-b")
    f = tmp_path / "file.txt"
    f.write_text("file")

    created = compose_workspace(env, workspace_dir=base, files=[f])
    assert sorted(created) == ["a.txt", "file.txt", "sub/b.txt"]
    assert (env / "a.txt").read_text() == "base-a"
    assert (env / "file.txt").read_text() == "file"


def test_collision_between_layers_rejected(tmp_path):
    env = tmp_path / "env"
    base = tmp_path / "base"
    base.mkdir()
    (base / "a.txt").write_text("base")
    f = tmp_path / "a.txt"
    f.write_text("file")

    with pytest.raises(WorkspaceError, match="collision"):
        compose_workspace(env, workspace_dir=base, files=[f])


def test_same_filename_in_different_dirs_not_collision(tmp_path):
    env = tmp_path / "env"
    d1 = tmp_path / "d1"
    d2 = tmp_path / "d2"
    d1.mkdir()
    d2.mkdir()
    (d1 / "x.txt").write_text("1")
    (d2 / "y.txt").write_text("2")
    created = compose_workspace(env, files=[d1 / "x.txt", d2 / "y.txt"])
    assert "x.txt" in created
    assert "y.txt" in created


def test_missing_layer_rejected(tmp_path):
    env = tmp_path / "env"
    with pytest.raises(WorkspaceError, match="not found"):
        compose_workspace(env, workspace_dir=tmp_path / "nope")


def test_empty_workspace(tmp_path):
    env = tmp_path / "env"
    created = compose_workspace(env)
    assert created == []
    assert env.is_dir()
