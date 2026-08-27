"""Tests for Harbor task generation."""

from __future__ import annotations

import tomllib
from pathlib import Path

import pytest

from harbor_mod.convert.discover import load_evals_file
from harbor_mod.convert.schema import resolve_eval_paths
from harbor_mod.convert.task import DEFAULT_TASK_TOML, generate_task


@pytest.fixture
def skill(tmp_path: Path) -> Path:
    skill = tmp_path / "test-skill"
    (skill / "evals").mkdir(parents=True)
    (skill / "SKILL.md").write_text("# Test")
    (skill / "harbor").mkdir()
    (skill / "harbor" / "workspace").mkdir()
    (skill / "harbor" / "workspace" / "core.txt").write_text("core")
    import json as _json

    (skill / "evals" / "evals.json").write_text(
        _json.dumps(
            {
                "skill_name": "test-skill",
                "harbor": {
                    "workspace_dir": "harbor/workspace",
                    "kwargs": {"max_ai_credits": 30},
                },
                "evals": [
                    {
                        "id": 1,
                        "name": "case-one",
                        "prompt": "do the thing",
                        "expected_output": "the thing done",
                        "expectations": ["inspects repo"],
                        "files": [],
                    }
                ],
            }
        )
    )
    return skill


def test_generate_task_structure(skill: Path, tmp_path: Path):
    evals, skill_dir = load_evals_file(skill / "evals" / "evals.json")
    task_root = tmp_path / "task"
    created = generate_task(
        evals_file=evals,
        case_id=1,
        task_root=task_root,
        workspace_dir=skill_dir / "harbor" / "workspace",
    )

    assert "core.txt" in created
    # required files per Harbor TaskPaths
    assert (task_root / "task.toml").is_file()
    assert (task_root / "instruction.md").is_file()
    assert (task_root / "environment").is_dir()
    assert (task_root / "environment" / "Dockerfile").is_file()
    assert (task_root / "tests" / "test.sh").is_file()
    assert (task_root / "solution" / "solve.sh").is_file()

    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert toml["task"]["name"].startswith("pagopa/")
    assert (task_root / "environment" / "core.txt").read_text() == "core"
    assert toml["verifier"]["env"]["OPENAI_API_BASE"] == "https://api.githubcopilot.com"
    # separate verifier env (default): dedicated container, artifacts declared
    assert toml["verifier"]["environment_mode"] == "separate"
    assert "/workspace" in toml["artifacts"]
    assert "/logs/agent/copilot-cli.jsonl" in toml["artifacts"]
    assert "/logs/agent/trajectory.json" in toml["artifacts"]
    # verifier image Dockerfile built from tests/
    assert (task_root / "tests" / "Dockerfile").is_file()

    quality = tomllib.loads((task_root / "tests" / "quality.toml").read_text())
    assert quality["judge"]["judge"] == "openai/gpt-5.6-luna"
    assert quality["judge"]["files"] == ["/logs/artifacts/workspace-packet.md"]
    # expected_output + expectations -> one binary criterion each
    descriptions = [c["description"] for c in quality["criterion"]]
    assert len(descriptions) == 2
    assert "the thing done" in descriptions[0]
    assert descriptions[1] == "inspects repo"
    assert all(c["type"] == "binary" for c in quality["criterion"])


def test_shared_verifier_mode_omits_separation(skill: Path, tmp_path: Path):
    import json as _json

    skill_dir = skill
    (skill_dir / "evals" / "evals.json").write_text(
        _json.dumps(
            {
                "skill_name": "test-skill",
                "harbor": {"verifier_mode": "shared"},
                "evals": [
                    {
                        "id": 1,
                        "prompt": "do the thing",
                        "expected_output": "the thing done",
                        "expectations": [],
                    }
                ],
            }
        )
    )
    evals, _ = load_evals_file(skill_dir / "evals" / "evals.json")
    task_root = tmp_path / "shared-task"
    generate_task(evals_file=evals, case_id=1, task_root=task_root)
    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert "environment_mode" not in toml["verifier"]
    assert toml["artifacts"] == []
    assert not (task_root / "tests" / "Dockerfile").exists()


def test_generate_task_empty_workspace(skill: Path, tmp_path: Path):
    evals, _ = load_evals_file(skill / "evals" / "evals.json")
    task_root = tmp_path / "task2"
    created = generate_task(evals_file=evals, case_id=1, task_root=task_root)
    assert created == []
    assert not list((task_root / "environment").iterdir()) or (
        task_root / "environment" / "Dockerfile"
    ).is_file()


def test_env_overrides_merge(skill: Path, tmp_path: Path):
    evals, _ = load_evals_file(skill / "evals" / "evals.json")
    task_root = tmp_path / "task3"
    generate_task(
        evals_file=evals,
        case_id=1,
        task_root=task_root,
        env_overrides={"agent": {"timeout_sec": 42.0}},
    )
    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert toml["agent"]["timeout_sec"] == 42.0
    # skeleton defaults still present
    assert toml["schema_version"] == DEFAULT_TASK_TOML["schema_version"]


def _write_evals(
    skill: Path, *, harbor: dict | None = None, cases: list[dict] | None = None
) -> None:
    import json as _json

    data: dict = {
        "skill_name": "test-skill",
        "evals": cases
        or [
            {
                "id": 1,
                "name": "case-one",
                "prompt": "do the thing",
                "expected_output": "the thing done",
                "expectations": ["inspects repo"],
                "files": [],
            }
        ],
    }
    if harbor is not None:
        data["harbor"] = harbor
    (skill / "evals" / "evals.json").write_text(_json.dumps(data))


def _generate(skill: Path, task_root: Path) -> None:
    evals, _ = load_evals_file(skill / "evals" / "evals.json")
    resolved = resolve_eval_paths(evals, skill)
    generate_task(
        evals_file=evals,
        case_id=1,
        task_root=task_root,
        overrides=resolved[1]["overrides"],
    )


def test_config_file_overrides(skill: Path, tmp_path: Path):
    skill_dir = skill
    (skill_dir / "harbor").mkdir(exist_ok=True)
    (skill_dir / "harbor" / "quality-suite.toml").write_text("suite quality\n")
    (skill_dir / "harbor" / "quality-case.toml").write_text("case quality\n")
    (skill_dir / "harbor" / "test.sh").write_text(
        "#!/bin/sh\necho custom {{SKILL_NAME}}\n"
    )
    (skill_dir / "harbor" / "Dockerfile").write_text("FROM custom:latest\n")
    _write_evals(
        skill_dir,
        harbor={"overrides": {"tests/quality.toml": "harbor/quality-suite.toml"}},
        cases=[
            {
                "id": 1,
                "name": "case-one",
                "prompt": "do the thing",
                "expected_output": "the thing done",
                "expectations": ["inspects repo"],
                "files": [],
                "harbor": {
                    "overrides": {
                        "tests/quality.toml": "harbor/quality-case.toml",
                        "tests/test.sh": "harbor/test.sh",
                        "environment/Dockerfile": "harbor/Dockerfile",
                    }
                },
            }
        ],
    )
    task_root = tmp_path / "task"
    _generate(skill_dir, task_root)

    # per-eval override wins over the suite-level one
    assert (task_root / "tests" / "quality.toml").read_text() == "case quality\n"
    # verbatim Dockerfile, placeholder-substituted test.sh
    assert (task_root / "environment" / "Dockerfile").read_text() == (
        "FROM custom:latest\n"
    )
    assert (
        (task_root / "tests" / "test.sh").read_text()
        == "#!/bin/sh\necho custom test-skill\n"
    )
    # non-overridden files still generated from templates
    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert toml["task"]["name"].startswith("pagopa/")


def test_task_toml_override_full_replace(skill: Path, tmp_path: Path):
    skill_dir = skill
    (skill_dir / "harbor").mkdir(exist_ok=True)
    (skill_dir / "harbor" / "task.toml").write_text(
        'schema_version = "1.4"\n'
        "[task]\n"
        'name = "{{TASK_NAME}}"\n'
        'description = "{{TASK_DESCRIPTION}}"\n'
        'version = "{{TASK_VERSION}}"\n'
        "[agent]\n"
        "timeout_sec = 123.0\n"
    )
    _write_evals(
        skill_dir,
        harbor={"overrides": {"task.toml": "harbor/task.toml"}},
        cases=[
            {
                "id": 1,
                "name": "case-one",
                "prompt": "do the thing",
                "expected_output": "the thing done",
                "expectations": ["inspects repo"],
                "files": [],
            }
        ],
    )
    task_root = tmp_path / "task"
    _generate(skill_dir, task_root)

    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert toml["task"]["name"] == "pagopa/test-skill-case-one"
    assert toml["task"]["description"] == "the thing done"
    assert toml["task"]["version"] == "1.0.0"
    assert toml["agent"]["timeout_sec"] == 123.0
    # full replace: no auto-generated verifier env leaked in
    assert "verifier" not in toml
