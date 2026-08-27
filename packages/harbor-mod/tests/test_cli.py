"""Tests for the ``harbor-mod convert`` CLI (deterministic, collision-free)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pytest
import yaml

from harbor_mod.cli import build_parser, cmd_convert

CASE_ONE = {
    "id": 1,
    "name": "case-one",
    "prompt": "do the thing",
    "expected_output": "the thing done",
    "expectations": ["inspects repo"],
    "files": [],
    "overlays": [],
}
CASE_TWO = {
    "id": 2,
    "name": "case-two",
    "prompt": "do the other thing",
    "expected_output": "the other thing done",
    "expectations": [],
    "files": [],
    "overlays": [],
}


def write_evals(
    skill: Path,
    *,
    skill_name: str = "test-skill",
    harbor: dict | None = None,
    cases: list[dict] | None = None,
) -> Path:
    """Create a skill dir with an evals.json and return its path."""
    (skill / "evals").mkdir(parents=True, exist_ok=True)
    (skill / "SKILL.md").write_text("# Test")
    data: dict = {"skill_name": skill_name, "evals": cases or [CASE_ONE]}
    if harbor is not None:
        data["harbor"] = harbor
    path = skill / "evals" / "evals.json"
    path.write_text(json.dumps(data))
    return path


def convert_args(out: Path, evals_paths: list[str], **overrides) -> argparse.Namespace:
    base = dict(
        out=str(out),
        config_out=None,
        evals=evals_paths,
        scan_root=None,
        without_skill=False,
        agent_kwargs=None,
        model=None,
        jobs_dir=None,
        n_concurrent=4,
        environment="docker",
    )
    base.update(overrides)
    return argparse.Namespace(**base)


def load_config(out: Path) -> dict:
    return yaml.safe_load((out / "config.yaml").read_text())


def test_convert_two_cases_same_name_different_ids(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(
        skill,
        cases=[
            {**CASE_ONE, "name": "same-name"},
            {**CASE_TWO, "name": "same-name"},
        ],
    )
    out = tmp_path / "out"
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    tasks = sorted(p.name for p in (out / "tasks").iterdir())
    assert tasks == ["test-skill-1-same-name", "test-skill-2-same-name"]


def test_reconvert_removes_stale_tasks(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill, cases=[CASE_ONE, CASE_TWO])
    out = tmp_path / "out"
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    assert (out / "tasks" / "test-skill-1-case-one").is_dir()
    assert (out / "tasks" / "test-skill-2-case-two").is_dir()

    # case two is deleted from the source eval; re-conversion must drop it
    write_evals(skill, cases=[CASE_ONE])
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    assert (out / "tasks" / "test-skill-1-case-one").is_dir()
    assert not (out / "tasks" / "test-skill-2-case-two").exists()
    # unrelated output (the generated config) is preserved
    assert (out / "config.yaml").is_file()


def test_reconvert_removes_stale_fixture_files(tmp_path: Path):
    skill = tmp_path / "skill"
    (skill / "harbor" / "workspace").mkdir(parents=True)
    (skill / "harbor" / "workspace" / "seed.txt").write_text("seed")
    (skill / "harbor" / "workspace" / "obsolete.txt").write_text("old")
    evals_path = write_evals(
        skill, harbor={"workspace_dir": "harbor/workspace"}, cases=[CASE_ONE]
    )
    out = tmp_path / "out"
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    env = out / "tasks" / "test-skill-1-case-one" / "environment"
    assert (env / "obsolete.txt").is_file()

    (skill / "harbor" / "workspace" / "obsolete.txt").unlink()
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    assert not (env / "obsolete.txt").exists()
    assert (env / "seed.txt").is_file()


def test_failed_conversion_preserves_last_complete_task(tmp_path: Path):
    skill = tmp_path / "skill"
    (skill / "fixtures").mkdir(parents=True)
    (skill / "fixtures" / "seed.txt").write_text("seed")
    evals_path = write_evals(
        skill,
        cases=[
            {
                **CASE_ONE,
                "files": ["fixtures/seed.txt"],
            }
        ],
    )
    out = tmp_path / "out"
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    task = out / "tasks" / "test-skill-1-case-one"
    assert (task / "environment" / "seed.txt").is_file()

    # a missing fixture fails the conversion after the first successful run
    (skill / "fixtures" / "seed.txt").unlink()
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 1
    assert (task / "task.toml").is_file()
    assert (task / "environment" / "seed.txt").is_file()


def test_duplicate_task_name_across_files_fails(tmp_path: Path, capsys):
    a = tmp_path / "a"
    b = tmp_path / "b"
    evals_a = write_evals(a, skill_name="dup-skill", cases=[CASE_ONE])
    evals_b = write_evals(b, skill_name="dup-skill", cases=[CASE_ONE])
    out = tmp_path / "out"
    rc = cmd_convert(
        convert_args(out, [str(evals_a), str(evals_b)])
    )
    assert rc == 1
    assert "duplicate task name" in capsys.readouterr().err
    assert not (out / "tasks").exists()


def test_conflicting_kwargs_fail_before_writing(tmp_path: Path, capsys):
    a = tmp_path / "a"
    b = tmp_path / "b"
    evals_a = write_evals(
        a, skill_name="skill-a", harbor={"kwargs": {"reasoning_effort": "high"}}
    )
    evals_b = write_evals(
        b, skill_name="skill-b", harbor={"kwargs": {"reasoning_effort": "low"}}
    )
    out = tmp_path / "out"
    rc = cmd_convert(convert_args(out, [str(evals_a), str(evals_b)]))
    assert rc == 1
    assert "conflicting harbor.kwargs" in capsys.readouterr().err
    # nothing is committed: no tasks, no config
    assert not (out / "tasks").exists()
    assert not (out / "config.yaml").exists()


def test_declared_kwargs_land_in_config_and_cli_overrides(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill, harbor={"kwargs": {"max_ai_credits": 30}})
    out = tmp_path / "out"
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    kwargs = load_config(out)["agents"][0]["kwargs"]
    assert kwargs == {"reasoning_effort": "high", "max_ai_credits": 30}

    # CLI --ak wins over the declared value
    assert (
        cmd_convert(
            convert_args(out, [str(evals_path)], agent_kwargs={"max_ai_credits": 50})
        )
        == 0
    )
    kwargs = load_config(out)["agents"][0]["kwargs"]
    assert kwargs["max_ai_credits"] == 50
    assert kwargs["reasoning_effort"] == "high"


def test_convert_is_deterministic_across_runs(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill, cases=[CASE_ONE, CASE_TWO])
    out = tmp_path / "out"
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    first = sorted(
        (p.relative_to(out).as_posix(), p.read_bytes() if p.is_file() else None)
        for p in sorted(out.rglob("*")) if p.is_file()
    )

    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    second = sorted(
        (p.relative_to(out).as_posix(), p.read_bytes() if p.is_file() else None)
        for p in sorted(out.rglob("*")) if p.is_file()
    )
    assert first == second


def test_default_environment_is_docker_in_config(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill)
    out = tmp_path / "out"
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    assert load_config(out)["environment"] == {"type": "docker"}


def test_convert_apple_container_environment(tmp_path: Path, monkeypatch):
    # The host may lack the `container` CLI; the prerequisite check is a
    # separate, host-dependent concern (covered by its own tests).
    monkeypatch.setattr(
        "harbor_mod.cli.validate_environment_prerequisites",
        lambda environment: None,
    )
    skill = tmp_path / "skill"
    evals_path = write_evals(skill)
    out = tmp_path / "out"
    assert (
        cmd_convert(
            convert_args(out, [str(evals_path)], environment="apple-container")
        )
        == 0
    )
    assert load_config(out)["environment"] == {"type": "apple-container"}


def test_convert_apple_container_prerequisites_fail_fast(
    tmp_path: Path, monkeypatch, capsys
):
    def fake_validate(environment: str) -> str | None:
        assert environment == "apple-container"
        return "Apple Container requires the 'container' CLI to be installed."

    monkeypatch.setattr(
        "harbor_mod.cli.validate_environment_prerequisites", fake_validate
    )
    skill = tmp_path / "skill"
    evals_path = write_evals(skill)
    out = tmp_path / "out"
    rc = cmd_convert(
        convert_args(out, [str(evals_path)], environment="apple-container")
    )
    assert rc == 1
    assert "Apple Container requires" in capsys.readouterr().err
    # fail-fast: nothing is written
    assert not (out / "tasks").exists()
    assert not (out / "config.yaml").exists()


def test_parser_rejects_unknown_environment():
    with pytest.raises(SystemExit):
        build_parser().parse_args(["convert", "--environment", "podman"])
