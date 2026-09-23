"""Tests for eval-case fixture staging into ``environment/``."""

from __future__ import annotations

from pathlib import Path

import pytest

from harbor_bench.convert.workspace import WorkspaceError, compose_workspace


def test_stages_files_by_basename(tmp_path):
    env = tmp_path / "env"
    a = tmp_path / "a" / "x.txt"
    a.parent.mkdir(parents=True)
    a.write_text("x")
    b = tmp_path / "sub" / "dir" / "y.txt"
    b.parent.mkdir(parents=True)
    b.write_text("y")

    created = compose_workspace(env, files=[a, b])
    assert sorted(created) == ["x.txt", "y.txt"]
    assert (env / "x.txt").read_text() == "x"
    assert (env / "y.txt").read_text() == "y"


def test_duplicate_basename_rejected(tmp_path):
    env = tmp_path / "env"
    d1 = tmp_path / "d1"
    d2 = tmp_path / "d2"
    d1.mkdir()
    d2.mkdir()
    (d1 / "x.txt").write_text("1")
    (d2 / "x.txt").write_text("2")

    with pytest.raises(WorkspaceError, match="collision"):
        compose_workspace(env, files=[d1 / "x.txt", d2 / "x.txt"])


def test_fixture_colliding_with_reserved_name_rejected(tmp_path):
    env = tmp_path / "env"
    d = tmp_path / "d"
    d.mkdir()
    dockerfile = d / "Dockerfile"
    dockerfile.write_text("FROM x")
    dockerignore = d / ".dockerignore"
    dockerignore.write_text("*")

    with pytest.raises(WorkspaceError, match="generated environment file"):
        compose_workspace(env, files=[dockerfile], reserved=("Dockerfile",))
    with pytest.raises(WorkspaceError, match="generated environment file"):
        compose_workspace(env, files=[dockerignore], reserved=(".dockerignore",))


def test_missing_file_rejected(tmp_path):
    env = tmp_path / "env"
    with pytest.raises(WorkspaceError, match="not found"):
        compose_workspace(env, files=[tmp_path / "nope.txt"])


def test_empty_files_creates_dir_only(tmp_path):
    env = tmp_path / "env"
    created = compose_workspace(env)
    assert created == []
    assert env.is_dir()
