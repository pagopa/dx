"""Tests for evals.json schema + path resolution."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from harbor_mod.convert.discover import load_evals_file
from harbor_mod.convert.schema import EvalsFile, HarborMeta, resolve_eval_paths


def make_evals(skill_dir: Path, **overrides) -> dict:
    case = {
        "id": 1,
        "name": "case-one",
        "prompt": "do the thing",
        "expected_output": "the thing done",
        "expectations": ["inspects repo", "asks user"],
        "files": ["fixtures/a.txt"],
        "overlays": ["fixtures/overlay"],
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
    (skill / "fixtures" / "overlay").mkdir()
    (skill / "fixtures" / "overlay" / "b.txt").write_text("b")
    evals_file = skill / "evals" / "evals.json"
    evals_file.write_text(json.dumps(make_evals(skill)))

    evals, skill_dir = load_evals_file(evals_file)
    assert evals.skill_name == "test-skill"
    assert skill_dir == skill
    assert evals.harbor == HarborMeta()

    resolved = resolve_eval_paths(evals, skill_dir)
    assert resolved[1]["files"][0].name == "a.txt"
    assert resolved[1]["overlays"][0].name == "overlay"


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


def test_verifier_mode_default_and_validation():
    data = make_evals(Path("."))
    assert EvalsFile.model_validate(data).harbor.verifier_mode == "separate"
    assert EvalsFile.model_validate(data).harbor.artifacts == []

    with pytest.raises(ValueError, match="verifier_mode"):
        EvalsFile.model_validate(
            make_evals(Path("."), harbor={"verifier_mode": "bogus"})
        )


def _make_skill(tmp_path: Path, name: str = "s") -> Path:
    skill = tmp_path / name
    (skill / "evals").mkdir(parents=True)
    (skill / "SKILL.md").write_text("# T")
    return skill


def test_overrides_merge_suite_then_case(tmp_path):
    skill = _make_skill(tmp_path)
    (skill / "harbor").mkdir()
    (skill / "harbor" / "quality.toml").write_text("suite quality")
    (skill / "harbor" / "case1.toml").write_text("case task")
    (skill / "harbor" / "dockerfile").write_text("suite docker")
    (skill / "harbor" / "case-dockerfile").write_text("case docker")

    evals = EvalsFile.model_validate(
        make_evals(
            skill,
            harbor={
                "overrides": {
                    "tests/quality.toml": "harbor/quality.toml",
                    "environment/Dockerfile": "harbor/dockerfile",
                }
            },
            case={
                "files": [],
                "overlays": [],
                "harbor": {
                    "overrides": {
                        "task.toml": "harbor/case1.toml",
                        "environment/Dockerfile": "harbor/case-dockerfile",
                    }
                },
            },
        )
    )
    resolved = resolve_eval_paths(evals, skill)
    overrides = resolved[1]["overrides"]
    assert overrides["tests/quality.toml"].name == "quality.toml"
    assert overrides["task.toml"].name == "case1.toml"
    # per-case override wins over the suite-level one
    assert overrides["environment/Dockerfile"].name == "case-dockerfile"


def test_override_missing_file_rejected(tmp_path):
    skill = _make_skill(tmp_path)
    evals = EvalsFile.model_validate(
        make_evals(
            skill,
            harbor={"overrides": {"tests/quality.toml": "harbor/nope.toml"}},
            case={"files": [], "overlays": []},
        )
    )
    with pytest.raises(ValueError, match="override"):
        resolve_eval_paths(evals, skill)


def test_override_unknown_target_rejected(tmp_path):
    skill = _make_skill(tmp_path)
    with pytest.raises(ValueError, match="override target"):
        EvalsFile.model_validate(
            make_evals(skill, harbor={"overrides": {"foo.txt": "harbor/x"}})
        )


def test_override_unsafe_path_rejected(tmp_path):
    skill = _make_skill(tmp_path)
    with pytest.raises(ValueError, match="unsafe"):
        EvalsFile.model_validate(
            make_evals(
                skill, case={"harbor": {"overrides": {"task.toml": "../x"}}}
            )
        )


def test_prepare_script_default_none(tmp_path):
    skill = _make_skill(tmp_path)
    evals = EvalsFile.model_validate(
        make_evals(skill, case={"files": [], "overlays": []})
    )
    assert evals.harbor.prepare_script is None
    resolved = resolve_eval_paths(evals, skill)
    assert resolved[1]["prepare_script"] is None


def test_prepare_script_suite_and_per_eval(tmp_path):
    skill = _make_skill(tmp_path)
    (skill / "harbor").mkdir()
    (skill / "harbor" / "prepare.sh").write_text("suite prepare")
    (skill / "harbor" / "case-prepare.sh").write_text("case prepare")

    evals = EvalsFile.model_validate(
        make_evals(
            skill,
            harbor={"prepare_script": "harbor/prepare.sh"},
            case={"files": [], "overlays": []},
        )
    )
    resolved = resolve_eval_paths(evals, skill)
    assert resolved[1]["prepare_script"] == (skill / "harbor" / "prepare.sh").resolve()

    # per-eval prepare_script wins over the suite-level one
    evals = EvalsFile.model_validate(
        make_evals(
            skill,
            harbor={"prepare_script": "harbor/prepare.sh"},
            case={
                "files": [],
                "overlays": [],
                "harbor": {"prepare_script": "harbor/case-prepare.sh"},
            },
        )
    )
    resolved = resolve_eval_paths(evals, skill)
    assert resolved[1]["prepare_script"] == (
        skill / "harbor" / "case-prepare.sh"
    ).resolve()


def test_prepare_script_missing_rejected(tmp_path):
    skill = _make_skill(tmp_path)
    evals = EvalsFile.model_validate(
        make_evals(
            skill,
            harbor={"prepare_script": "harbor/nope.sh"},
            case={"files": [], "overlays": []},
        )
    )
    with pytest.raises(ValueError, match="prepare_script not found"):
        resolve_eval_paths(evals, skill)


def test_prepare_script_unsafe_path_rejected(tmp_path):
    skill = _make_skill(tmp_path)
    with pytest.raises(ValueError, match="unsafe"):
        EvalsFile.model_validate(
            make_evals(skill, harbor={"prepare_script": "../x.sh"})
        )
