"""Tests for the shared Nx and Python package version."""

from __future__ import annotations

import tomllib
from pathlib import Path

from harbor_bench import __version__


def test_python_version_comes_from_pyproject():
    pyproject_file = Path(__file__).parents[1] / "pyproject.toml"
    pyproject = tomllib.loads(pyproject_file.read_text(encoding="utf-8"))

    assert __version__ == pyproject["project"]["version"]
