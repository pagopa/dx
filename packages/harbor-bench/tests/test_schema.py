"""Tests for evals.json schema + path resolution."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from harbor_bench.convert.discover import load_evals_file
from harbor_bench.convert.schema import EvalsFile, resolve_eval_paths


def make_evals(skill_dir: Path, **overrides) -> dict:
    case = {
        "id": 1,
        "name": "case-one",
        "prompt": "do the thing",
        "expected_output": "the thing done",
        "expectations": ["inspects repo", "asks user"],
        "files": ["fixtures/a.txt"],
    }
    case.update(overrides.pop("case", {}))
    data = {
        "skill_name": "test-skill",
        "evals": [case],
    }
    data.update(overrides)
    return data


def test_load_and_skill_dir(tmp_path):
    skill = tmp_path / "test-skill"
    (skill / "evals").mkdir(parents=True)
    (skill / "SKILL.md").write_text("# Test")
    (skill / "fixtures").mkdir()
    (skill / "fixtures" / "a.txt").write_text("a")
    evals_file = skill / "evals" / "evals.json"
    evals_file.write_text(json.dumps(make_evals(skill)))

    evals, skill_dir = load_evals_file(evals_file)
    assert evals.skill_name == "test-skill"
    assert skill_dir == skill

    resolved = resolve_eval_paths(evals, skill_dir)
    assert resolved[1]["files"][0].name == "a.txt"
    assert resolved[1]["prepare_script"] is None


def test_duplicate_ids_rejected(tmp_path):
    data = make_evals(tmp_path, evals=[
        {"id": 1, "prompt": "a", "expected_output": "b"},
        {"id": 1, "prompt": "c", "expected_output": "d"},
    ])
    with pytest.raises(ValueError, match="unique"):
        EvalsFile.model_validate(data)


def test_missing_file_rejected(tmp_path):
    skill = tmp_path / "s"
    (skill / "evals").mkdir(parents=True)
    (skill / "SKILL.md").write_text("# T")
    evals = EvalsFile.model_validate(make_evals(skill))
    with pytest.raises(ValueError, match="file not found"):
        resolve_eval_paths(evals, skill)


def test_unsafe_path_rejected(tmp_path):
    skill = tmp_path / "s"
    (skill / "evals").mkdir(parents=True)
    (skill / "SKILL.md").write_text("# T")
    evals = EvalsFile.model_validate(make_evals(skill, case={"files": ["../x"]}))
    with pytest.raises(ValueError, match="unsafe"):
        resolve_eval_paths(evals, skill)


@pytest.mark.parametrize(
    "extra",
    [
        {"overlays": []},
        {"harbor": {"kwargs": {"max_ai_credits": 30}}},
    ],
)
def test_removed_harbor_fields_are_rejected(extra):
    data = make_evals(Path("."))
    if "overlays" in extra:
        data["evals"][0].update(extra)
    else:
        data.update(extra)

    with pytest.raises(ValueError, match="Extra inputs are not permitted"):
        EvalsFile.model_validate(data)
