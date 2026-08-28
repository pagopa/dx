"""Tests for the Run-builder: plan_run + apply_run (evals -> tasks + config).

The whole convert workflow is exercised through its two seams — a plan never
writes, apply writes the tasks + config — so the invariants (validate the whole
input before writing, collision-free naming, stale cleanup, atomic per-task
generation) are asserted here rather than through the CLI adapter.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from harbor_bench.convert.discover import DiscoverError
from harbor_bench.convert.run import (
    ConvertOptions,
    TaskNameCollision,
    apply_run,
    check_host_environment,
    plan_run,
)
from harbor_bench.convert.workspace import WorkspaceError

from tests.conftest import CASE_ONE, CASE_TWO, write_evals


def make_options(out: Path, evals_paths: list[Path], **overrides) -> ConvertOptions:
    base = dict(
        out=out,
        evals=tuple(evals_paths),
        without_skill=False,
        agent_kwargs=None,
        model=None,
        environment="docker",
        jobs_dir=None,
        n_concurrent=4,
    )
    base.update(overrides)
    return ConvertOptions(**base)


def plan_and_apply(out: Path, evals_paths: list[Path], **overrides):
    plan = plan_run(make_options(out, evals_paths, **overrides))
    result = apply_run(plan)
    return plan, result


def load_config(out: Path) -> dict:
    return yaml.safe_load((out / "config.yaml").read_text())


def snapshot(out: Path) -> list[tuple[str, bytes]]:
    return sorted(
        (p.relative_to(out).as_posix(), p.read_bytes() if p.is_file() else None)
        for p in sorted(out.rglob("*"))
        if p.is_file()
    )


# --- plan ----------------------------------------------------------------


def test_plan_names_cases_by_id_and_slug(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(
        skill,
        cases=[
            {**CASE_ONE, "name": "same-name"},
            {**CASE_TWO, "name": "same-name"},
        ],
    )
    plan = plan_run(make_options(tmp_path / "out", [evals_path]))
    assert [t.task_dir for t in plan.tasks] == [
        "test-skill-1-same-name",
        "test-skill-2-same-name",
    ]
    assert not (tmp_path / "out").exists()


def test_plan_resolves_fixtures_once(tmp_path: Path):
    skill = tmp_path / "skill"
    (skill / "fixtures").mkdir(parents=True)
    (skill / "fixtures" / "seed.txt").write_text("seed")
    evals_path = write_evals(
        skill, cases=[{**CASE_ONE, "files": ["fixtures/seed.txt"]}, CASE_TWO]
    )
    plan = plan_run(make_options(tmp_path / "out", [evals_path]))
    assert plan.tasks[0].paths["files"] == [
        (skill / "fixtures" / "seed.txt").resolve()
    ]


def test_duplicate_task_name_across_files_raises(tmp_path: Path):
    a = tmp_path / "a"
    b = tmp_path / "b"
    evals_a = write_evals(a, skill_name="dup-skill", cases=[CASE_ONE])
    evals_b = write_evals(b, skill_name="dup-skill", cases=[CASE_ONE])
    with pytest.raises(TaskNameCollision, match="duplicate task name"):
        plan_run(make_options(tmp_path / "out", [evals_a, evals_b]))
    assert not (tmp_path / "out").exists()


def test_conflicting_kwargs_raise_before_writing(tmp_path: Path):
    a = tmp_path / "a"
    b = tmp_path / "b"
    evals_a = write_evals(
        a, skill_name="skill-a", harbor={"kwargs": {"reasoning_effort": "high"}}
    )
    evals_b = write_evals(
        b, skill_name="skill-b", harbor={"kwargs": {"reasoning_effort": "low"}}
    )
    with pytest.raises(ValueError, match="conflicting harbor.kwargs"):
        plan_run(make_options(tmp_path / "out", [evals_a, evals_b]))
    assert not (tmp_path / "out").exists()


def test_missing_fixture_fails_plan_and_preserves_last_complete_task(tmp_path: Path):
    skill = tmp_path / "skill"
    (skill / "fixtures").mkdir(parents=True)
    (skill / "fixtures" / "seed.txt").write_text("seed")
    evals_path = write_evals(skill, cases=[{**CASE_ONE, "files": ["fixtures/seed.txt"]}])
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])
    task = out / "tasks" / "test-skill-1-case-one"
    assert (task / "task.toml").is_file()

    # a missing fixture is an input validation failure: the re-plan fails
    # before any write, leaving the previous complete task untouched.
    (skill / "fixtures" / "seed.txt").unlink()
    with pytest.raises(ValueError, match="file not found"):
        plan_run(make_options(out, [evals_path]))
    assert (task / "task.toml").is_file()
    assert (task / "environment" / "seed.txt").is_file()


def test_unsupported_environment_raises_in_plan(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill)
    with pytest.raises(ValueError, match="unsupported environment type"):
        plan_run(make_options(tmp_path / "out", [evals_path], environment="podman"))
    assert not (tmp_path / "out").exists()


def test_no_evals_found_raises(tmp_path: Path):
    with pytest.raises(DiscoverError, match="no evals.json"):
        plan_run(make_options(tmp_path / "out", []))


# --- apply ---------------------------------------------------------------


def test_apply_failure_preserves_completed_tasks(tmp_path: Path):
    # Case 1 is clean; case 2 collides with the workspace layer, so the
    # apply-time failure leaves case 1's task (and no config) in place.
    skill = tmp_path / "skill"
    (skill / "harbor" / "workspace").mkdir(parents=True)
    (skill / "harbor" / "workspace" / "collide.txt").write_text("base")
    (skill / "fixtures").mkdir()
    (skill / "fixtures" / "collide.txt").write_text("file-layer")
    evals_path = write_evals(
        skill,
        harbor={"workspace_dir": "harbor/workspace"},
        cases=[CASE_ONE, {**CASE_TWO, "files": ["fixtures/collide.txt"]}],
    )
    out = tmp_path / "out"
    plan = plan_run(make_options(out, [evals_path]))
    with pytest.raises(WorkspaceError, match="collision"):
        apply_run(plan)
    assert (out / "tasks" / "test-skill-1-case-one" / "task.toml").is_file()
    assert not (out / "tasks" / "test-skill-2-case-two").exists()
    assert not (out / "config.yaml").exists()


def test_reapply_removes_stale_tasks(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill, cases=[CASE_ONE, CASE_TWO])
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])
    assert (out / "tasks" / "test-skill-1-case-one").is_dir()
    assert (out / "tasks" / "test-skill-2-case-two").is_dir()

    # case two is deleted from the source eval; re-conversion must drop it
    write_evals(skill, cases=[CASE_ONE])
    _, result = plan_and_apply(out, [evals_path])
    assert (out / "tasks" / "test-skill-1-case-one").is_dir()
    assert not (out / "tasks" / "test-skill-2-case-two").exists()
    assert result.stale_removed == ("test-skill-2-case-two",)
    # unrelated output (the generated config) is preserved
    assert (out / "config.yaml").is_file()


def test_reapply_removes_stale_fixture_files(tmp_path: Path):
    skill = tmp_path / "skill"
    (skill / "harbor" / "workspace").mkdir(parents=True)
    (skill / "harbor" / "workspace" / "seed.txt").write_text("seed")
    (skill / "harbor" / "workspace" / "obsolete.txt").write_text("old")
    evals_path = write_evals(
        skill, harbor={"workspace_dir": "harbor/workspace"}, cases=[CASE_ONE]
    )
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])
    env = out / "tasks" / "test-skill-1-case-one" / "environment"
    assert (env / "obsolete.txt").is_file()

    (skill / "harbor" / "workspace" / "obsolete.txt").unlink()
    plan_and_apply(out, [evals_path])
    assert not (env / "obsolete.txt").exists()
    assert (env / "seed.txt").is_file()


def test_declared_kwargs_land_in_config_and_options_override(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill, harbor={"kwargs": {"max_ai_credits": 30}})
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])
    kwargs = load_config(out)["agents"][0]["kwargs"]
    assert kwargs == {"reasoning_effort": "high", "max_ai_credits": 30}

    # options.agent_kwargs wins over the declared value
    plan_and_apply(out, [evals_path], agent_kwargs={"max_ai_credits": 50})
    kwargs = load_config(out)["agents"][0]["kwargs"]
    assert kwargs["max_ai_credits"] == 50
    assert kwargs["reasoning_effort"] == "high"


def test_apply_is_deterministic_across_runs(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill, cases=[CASE_ONE, CASE_TWO])
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])
    first = snapshot(out)
    plan_and_apply(out, [evals_path])
    second = snapshot(out)
    assert first == second


def test_environment_option_lands_in_config(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill)
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])
    assert load_config(out)["environment"] == {"type": "docker"}

    out2 = tmp_path / "out2"
    plan_and_apply(out2, [evals_path], environment="apple-container")
    assert load_config(out2)["environment"] == {"type": "apple-container"}


# --- host preflight ------------------------------------------------------


def test_check_host_environment_docker_is_always_ready():
    assert check_host_environment("docker") is None


def test_check_host_environment_apple_requires_arm64(monkeypatch):
    monkeypatch.setattr("harbor_bench.convert.run.platform.machine", lambda: "x86_64")
    err = check_host_environment("apple-container")
    assert err is not None and "Apple silicon" in err


def test_check_host_environment_apple_requires_container_cli(monkeypatch):
    monkeypatch.setattr("harbor_bench.convert.run.platform.machine", lambda: "arm64")
    monkeypatch.setattr("harbor_bench.convert.run.shutil.which", lambda name: None)
    err = check_host_environment("apple-container")
    assert err is not None and "container" in err


def test_check_host_environment_apple_ready(monkeypatch):
    monkeypatch.setattr("harbor_bench.convert.run.platform.machine", lambda: "arm64")
    monkeypatch.setattr(
        "harbor_bench.convert.run.shutil.which", lambda name: "/usr/bin/container"
    )
    assert check_host_environment("apple-container") is None
