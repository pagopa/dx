"""Tests for Harbor task generation."""

from __future__ import annotations

import tomllib
from pathlib import Path

import pytest

from harbor_bench import task_shape
from harbor_bench.convert.discover import load_evals_file
from harbor_bench.convert.schema import resolve_eval_paths
from harbor_bench.convert.task import (
    DEFAULT_TASK_TOML,
    TaskSpec,
    generate_task,
    generate_task_atomic,
    task_dir_name,
    task_name,
)
from harbor_bench.convert.workspace import WorkspaceError


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


def make_spec(
    skill: Path,
    case_id: int = 1,
    *,
    workspace_dir: Path | None = None,
    env_overrides: dict | None = None,
    paths: dict | None = None,
) -> TaskSpec:
    """Build a fully-resolved TaskSpec for ``case_id`` in ``skill``."""
    evals, _ = load_evals_file(skill / "evals" / "evals.json")
    resolved = resolve_eval_paths(evals, skill)
    case = next(c for c in evals.evals if c.id == case_id)
    return TaskSpec(
        task_dir=task_dir_name(evals.skill_name, case.id, case.name),
        skill_name=evals.skill_name,
        case=case,
        paths=paths if paths is not None else resolved[case_id],
        workspace_dir=workspace_dir,
        env_overrides=env_overrides,
    )


def test_generate_task_structure(skill: Path, tmp_path: Path):
    task_root = tmp_path / "task"
    created = generate_task(
        make_spec(skill, workspace_dir=skill / "harbor" / "workspace"), task_root
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
    assert toml["verifier"]["env"] == task_shape.JUDGE_BRIDGE_ENV
    # separate verifier env (default): dedicated container, artifacts declared
    assert toml["verifier"]["environment_mode"] == "separate"
    # the writer emits exactly the artifacts the reader (jobs) consumes
    assert toml["artifacts"] == list(task_shape.HARBOR_ARTIFACTS)
    # verifier image Dockerfile built from tests/
    assert (task_root / "tests" / "Dockerfile").is_file()

    quality = tomllib.loads((task_root / "tests" / "quality.toml").read_text())
    assert quality["judge"]["judge"] == "openai/gpt-5.6-luna"
    assert quality["judge"]["files"] == [task_shape.WORKSPACE_PACKET_MD]
    # expected_output + expectations -> one binary criterion each
    descriptions = [c["description"] for c in quality["criterion"]]
    assert len(descriptions) == 2
    assert "the thing done" in descriptions[0]
    assert descriptions[1] == "inspects repo"
    assert all(c["type"] == "binary" for c in quality["criterion"])


def test_generate_task_empty_workspace(skill: Path, tmp_path: Path):
    task_root = tmp_path / "task2"
    created = generate_task(make_spec(skill), task_root)
    assert created == []
    assert not list((task_root / "environment").iterdir()) or (
        task_root / "environment" / "Dockerfile"
    ).is_file()


def test_env_overrides_merge(skill: Path, tmp_path: Path):
    task_root = tmp_path / "task3"
    generate_task(
        make_spec(skill, env_overrides={"agent": {"timeout_sec": 42.0}}),
        task_root,
    )
    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert toml["agent"]["timeout_sec"] == 42.0
    # skeleton defaults still present
    assert toml["schema_version"] == DEFAULT_TASK_TOML["schema_version"]


def test_task_dir_name_includes_case_id():
    # the eval ID always participates, so distinct cases never collide
    assert task_dir_name("skill", 1, "case-one") == "skill-1-case-one"
    assert task_dir_name("skill", 2, None) == "skill-2"
    assert task_dir_name("skill", 1, "same") != task_dir_name("skill", 2, "same")
    assert task_name("skill-1-case-one") == "pagopa/skill-1-case-one"
    assert task_name("skill-2") == "pagopa/skill-2"


def test_generate_task_atomic_preserves_previous_on_failure(
    skill: Path, tmp_path: Path
):
    task_root = tmp_path / "task"
    generate_task_atomic(make_spec(skill), task_root)
    marker = task_root / "instruction.md"
    original = marker.read_text()
    assert (task_root / "task.toml").is_file()

    with pytest.raises(WorkspaceError):
        evals, _ = load_evals_file(skill / "evals" / "evals.json")
        bad_paths = resolve_eval_paths(evals, skill)
        bad_paths[1]["files"] = [tmp_path / "does-not-exist.txt"]
        generate_task_atomic(make_spec(skill, paths=bad_paths[1]), task_root)
    # the last complete task is preserved and no temp dirs leak
    assert marker.read_text() == original
    assert (task_root / "task.toml").is_file()
    assert [p for p in tmp_path.iterdir() if p.name.startswith(".")] == []


def test_generated_dockerfile_bakes_copilot_cli(skill: Path, tmp_path: Path):
    task_root = tmp_path / "task"
    generate_task(make_spec(skill), task_root)
    dockerfile = (task_root / "environment" / "Dockerfile").read_text()
    # the CLI is baked in so per-trial reinstalls are skipped at runtime
    assert "curl -fsSL https://gh.io/copilot-install | bash" in dockerfile
    # installs to $HOME/.local/bin and validates the binary at build time
    assert 'export PATH="$HOME/.local/bin:$PATH"' in dockerfile
    assert "copilot --version" in dockerfile
    # baked before the workspace COPY so the layer survives workspace changes
    assert dockerfile.index("copilot-install") < dockerfile.index(
        f"COPY . {task_shape.WORKSPACE_DIR}/"
    )


def test_generated_dockerfile_deterministic_git_baseline(
    skill: Path, tmp_path: Path
):
    task_root = tmp_path / "task"
    generate_task(make_spec(skill), task_root)
    dockerfile = (task_root / "environment" / "Dockerfile").read_text()
    # deterministic repo-local identity, never the base image's global config
    assert 'git config user.name "harbor-bench"' in dockerfile
    assert 'git config user.email "harbor-bench@pagopa.invalid"' in dockerfile
    # no `|| true`: image construction fails visibly when the baseline fails;
    # `--allow-empty` keeps the baseline valid for empty workspaces
    assert "git commit -qm baseline --allow-empty" in dockerfile
    assert "git commit -qm baseline || true" not in dockerfile
    assert "|| true" not in dockerfile.split("RUN")[-1]
    # ordering within the RUN command (comments mention "git commit" too)
    last_run = dockerfile.split("RUN")[-1]
    assert last_run.index("git init") < last_run.index("git commit")


def _write_evals(skill: Path, *, cases: list[dict] | None = None) -> None:
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
    (skill / "evals" / "evals.json").write_text(_json.dumps(data))


def _generate(skill: Path, task_root: Path) -> None:
    generate_task(make_spec(skill), task_root)


def test_leftover_harbor_files_do_not_override_generated_files(
    skill: Path, tmp_path: Path
):
    (skill / "harbor" / "task.toml").write_text(
        '[task]\nname = "leftover-task"\n'
    )
    (skill / "harbor" / "quality.toml").write_text("leftover quality\n")

    task_root = tmp_path / "task"
    _generate(skill, task_root)

    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert toml["task"]["name"] == "pagopa/test-skill-1-case-one"
    assert toml["agent"]["timeout_sec"] == 900.0
    assert "leftover-task" not in (task_root / "task.toml").read_text()
    assert "leftover quality" not in (task_root / "tests" / "quality.toml").read_text()


def test_prepare_script_copied_into_workspace(skill: Path, tmp_path: Path):
    skill_dir = skill
    (skill_dir / "harbor" / "prepare.sh").write_text(
        "#!/bin/sh\necho prepared > /workspace/status.txt\n"
    )
    task_root = tmp_path / "task"
    _generate(skill_dir, task_root)

    prepare = task_root / "environment" / "prepare.sh"
    assert prepare.is_file()
    assert "prepared" in prepare.read_text()
    # the generated Dockerfile runs it at build time, before the git baseline
    dockerfile = (task_root / "environment" / "Dockerfile").read_text()
    assert "prepare.sh" in dockerfile
    assert dockerfile.index("prepare.sh") < dockerfile.index("git init")


def test_prepare_script_per_eval_override(skill: Path, tmp_path: Path):
    skill_dir = skill
    (skill_dir / "harbor" / "prepare.sh").write_text("suite prepare")
    (skill_dir / "harbor" / "case-one").mkdir()
    (skill_dir / "harbor" / "case-one" / "prepare.sh").write_text("case prepare")
    task_root = tmp_path / "task"
    _generate(skill_dir, task_root)
    assert (task_root / "environment" / "prepare.sh").read_text() == "case prepare"


def test_prepare_script_collision_rejected(skill: Path, tmp_path: Path):
    skill_dir = skill
    # a fixture layer already ships prepare.sh
    (skill_dir / "harbor" / "workspace" / "prepare.sh").write_text("fixture")
    (skill_dir / "harbor" / "prepare.sh").write_text("suite prepare")
    task_root = tmp_path / "task"
    with pytest.raises(WorkspaceError, match="prepare.sh"):
        generate_task(
            make_spec(skill_dir, workspace_dir=skill_dir / "harbor" / "workspace"),
            task_root,
        )
