"""Tests for the Run-builder: plan_run + apply_run (evals -> tasks + config).

The whole convert workflow is exercised through its two seams — a plan never
writes, apply writes the tasks + config — so the invariants (validate the whole
input before writing, collision-free naming, stale cleanup, atomic per-task
generation) are asserted here rather than through the CLI adapter.
"""

from __future__ import annotations

import tomllib
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
    # Case 1 is clean; case 2 declares two per-eval fixtures with the same
    # basename, so the apply-time failure leaves case 1's task (and no config)
    # in place.
    skill = tmp_path / "skill"
    (skill / "fixtures" / "a").mkdir(parents=True)
    (skill / "fixtures" / "b").mkdir()
    (skill / "fixtures" / "a" / "collide.txt").write_text("from a")
    (skill / "fixtures" / "b" / "collide.txt").write_text("from b")
    evals_path = write_evals(
        skill,
        cases=[
            CASE_ONE,
            {**CASE_TWO, "files": ["fixtures/a/collide.txt", "fixtures/b/collide.txt"]},
        ],
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


def test_reapply_drops_removed_overlay_additions(tmp_path: Path):
    skill = tmp_path / "skill"
    (skill / "harbor" / "environment").mkdir(parents=True)
    (skill / "harbor" / "environment" / "seed.txt").write_text("seed")
    (skill / "harbor" / "environment" / "obsolete.txt").write_text("old")
    evals_path = write_evals(skill, cases=[CASE_ONE])
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])
    env = out / "tasks" / "test-skill-1-case-one" / "environment"
    assert (env / "obsolete.txt").is_file()

    (skill / "harbor" / "environment" / "obsolete.txt").unlink()
    plan_and_apply(out, [evals_path])
    assert not (env / "obsolete.txt").exists()
    assert (env / "seed.txt").is_file()


def test_cli_kwargs_land_in_config_and_override_defaults(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill)
    out = tmp_path / "out"
    plan_and_apply(
        out,
        [evals_path],
        agent_kwargs={"max_ai_credits": 50, "reasoning_effort": "low"},
    )
    kwargs = load_config(out)["agents"][0]["kwargs"]
    assert kwargs == {"max_ai_credits": 50, "reasoning_effort": "low"}


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
    assert load_config(out)["environment"] == {"type": "docker", "delete": False}

    out2 = tmp_path / "out2"
    plan_and_apply(out2, [evals_path], environment="apple-container")
    assert load_config(out2)["environment"] == {
        "type": "apple-container",
        "delete": False,
    }


# --- skill harbor/ overlay (replace generated task files) ---------------


def read_task_toml(task_dir: Path) -> dict:
    return tomllib.loads((task_dir / "task.toml").read_text())


def write_harbor(skill: Path, *parts: str, content: str = "") -> Path:
    path = skill.joinpath("harbor", *parts)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    return path


def test_suite_overlay_replaces_file_in_every_task(tmp_path: Path):
    skill = tmp_path / "skill"
    write_harbor(skill, "solution", "solve.sh", content="#!/bin/sh\necho custom\n")
    evals_path = write_evals(skill, cases=[CASE_ONE, CASE_TWO])
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])

    for name in ("test-skill-1-case-one", "test-skill-2-case-two"):
        solve = out / "tasks" / name / "solution" / "solve.sh"
        assert solve.read_text() == "#!/bin/sh\necho custom\n"
    # unrelated generated files are untouched by the suite overlay
    assert (out / "tasks" / "test-skill-1-case-one" / "task.toml").is_file()


def test_per_task_overlay_replaces_only_that_task_and_wins(tmp_path: Path):
    skill = tmp_path / "skill"
    write_harbor(skill, "tests", "quality.toml", content="suite-quality\n")
    write_harbor(
        skill,
        "test-skill-1-case-one",
        "tests",
        "quality.toml",
        content="task-quality\n",
    )
    evals_path = write_evals(skill, cases=[CASE_ONE, CASE_TWO])
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])

    q1 = out / "tasks" / "test-skill-1-case-one" / "tests" / "quality.toml"
    q2 = out / "tasks" / "test-skill-2-case-two" / "tests" / "quality.toml"
    assert q1.read_text() == "task-quality\n"  # per-task beats suite
    assert q2.read_text() == "suite-quality\n"


def test_per_task_task_toml_is_a_full_replacement(tmp_path: Path):
    skill = tmp_path / "skill"
    write_harbor(
        skill, "test-skill-1-case-one", "task.toml", content="[agent]\ntimeout_sec = 42.0\n"
    )
    evals_path = write_evals(skill, cases=[CASE_ONE, CASE_TWO])
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])

    task_toml = read_task_toml(out / "tasks" / "test-skill-1-case-one")
    assert task_toml == {"agent": {"timeout_sec": 42.0}}
    # the other task keeps its converter-generated task.toml
    other = read_task_toml(out / "tasks" / "test-skill-2-case-two")
    assert other["task"]["name"] == "pagopa/test-skill-2-case-two"


def test_suite_level_task_toml_override_is_rejected(tmp_path: Path):
    skill = tmp_path / "skill"
    write_harbor(skill, "task.toml", content='[task]\nname = "pagopa/x"\n')
    evals_path = write_evals(skill)
    with pytest.raises(ValueError, match="suite-level task.toml override is not allowed"):
        plan_run(make_options(tmp_path / "out", [evals_path]))
    assert not (tmp_path / "out").exists()


def test_legacy_environment_toml_is_now_an_inert_task_root_file(tmp_path: Path):
    # the old skill-wide harbor/environment.toml merge is gone; under the
    # add-anywhere overlay it would land at the task root, which nothing reads.
    skill = tmp_path / "skill"
    write_harbor(skill, "environment.toml", content="[environment]\n")
    evals_path = write_evals(skill)
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])
    task = out / "tasks" / "test-skill-1-case-one"
    assert (task / "environment.toml").read_text() == "[environment]\n"


def test_legacy_workspace_dir_fails_plan(tmp_path: Path):
    skill = tmp_path / "skill"
    write_harbor(skill, "workspace", "seed.txt", content="old fixture layer\n")
    evals_path = write_evals(skill)
    with pytest.raises(ValueError, match="harbor/workspace is no longer"):
        plan_run(make_options(tmp_path / "out", [evals_path]))
    assert not (tmp_path / "out").exists()


def test_overlay_adds_anywhere_in_the_task_tree(tmp_path: Path):
    skill = tmp_path / "skill"
    # an eval-key style legacy dir and a typo'd dir are now plain additions
    write_harbor(skill, "case-one", "notes.md", content="notes\n")
    write_harbor(skill, "enviroment", "Dockerfile", content="FROM ubuntu:24.04\n")
    evals_path = write_evals(skill, cases=[CASE_ONE])
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])
    task = out / "tasks" / "test-skill-1-case-one"
    assert (task / "case-one" / "notes.md").read_text() == "notes\n"
    assert (task / "enviroment" / "Dockerfile").read_text() == (
        "FROM ubuntu:24.04\n"
    )


def test_suite_overlay_adds_container_context_for_a_dockerfile_override(
    tmp_path: Path,
):
    # a custom environment/Dockerfile plus the scripts it references live in
    # the same harbor/environment/ subtree
    skill = tmp_path / "skill"
    write_harbor(
        skill, "environment", "Dockerfile", content="FROM ubuntu:24.04\nCOPY tool.sh /tool.sh\nRUN bash /tool.sh\n"
    )
    write_harbor(skill, "environment", "tool.sh", content="#!/bin/sh\necho setup\n")
    evals_path = write_evals(skill, cases=[CASE_ONE, CASE_TWO])
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path])

    for name in ("test-skill-1-case-one", "test-skill-2-case-two"):
        task = out / "tasks" / name
        assert "COPY tool.sh" in (task / "environment" / "Dockerfile").read_text()
        assert (task / "environment" / "tool.sh").is_file()


def test_run_level_flags_stay_authoritative_over_overridden_task_toml(tmp_path: Path):
    skill = tmp_path / "skill"
    write_harbor(
        skill, "test-skill-1-case-one", "task.toml", content="[agent]\ntimeout_sec = 42.0\n"
    )
    evals_path = write_evals(skill)
    out = tmp_path / "out"
    plan_and_apply(out, [evals_path], without_skill=True)

    task_toml = read_task_toml(out / "tasks" / "test-skill-1-case-one")
    # the author's full replacement survives ...
    assert task_toml["agent"] == {"timeout_sec": 42.0}
    # ... but the run-level gate is re-applied over the final task.toml
    assert task_toml["verifier"]["env"]["SKILL_EVAL_ENFORCE_SKILL_USE"] == "false"


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
