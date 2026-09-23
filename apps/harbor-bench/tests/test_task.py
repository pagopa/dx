"""Tests for Harbor task generation."""

from __future__ import annotations

import json as _json
import tomllib
from pathlib import Path

import pytest

from harbor_bench import task_shape
from harbor_bench.convert.discover import load_evals_file
from harbor_bench.convert.schema import resolve_eval_paths
from harbor_bench.convert.task import (
    GENERATED_TASK_FILES,
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
    overlay: dict[str, Path] | None = None,
    run_level_overrides: dict | None = None,
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
        overlay=overlay or {},
        run_level_overrides=run_level_overrides,
    )


def test_generate_task_structure(skill: Path, tmp_path: Path):
    task_root = tmp_path / "task"
    created = generate_task(make_spec(skill), task_root)

    assert created == []
    # required files per Harbor TaskPaths
    assert (task_root / "task.toml").is_file()
    assert (task_root / "instruction.md").is_file()
    assert (task_root / "environment").is_dir()
    assert (task_root / "environment" / "Dockerfile").is_file()
    assert (task_root / "tests" / "test.sh").is_file()
    assert (task_root / "solution" / "solve.sh").is_file()

    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert toml["task"]["name"].startswith("pagopa/")
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


def test_generate_task_writes_exactly_the_generated_file_set(
    skill: Path, tmp_path: Path
):
    task_root = tmp_path / "task"
    generate_task(make_spec(skill), task_root)
    generated = {
        p.relative_to(task_root).as_posix()
        for p in task_root.rglob("*")
        if p.is_file()
    }
    assert generated == set(GENERATED_TASK_FILES)


def test_instruction_md_is_the_prompt_only(skill: Path, tmp_path: Path):
    task_root = tmp_path / "task"
    generate_task(make_spec(skill), task_root)
    assert (task_root / "instruction.md").read_text() == "do the thing\n"


def test_task_dir_name_includes_case_id():
    # the eval ID always participates, so distinct cases never collide
    assert task_dir_name("skill", 1, "case-one") == "skill-1-case-one"
    assert task_dir_name("skill", 2, None) == "skill-2"
    assert task_dir_name("skill", 1, "same") != task_dir_name("skill", 2, "same")
    assert task_name("skill-1-case-one") == "pagopa/skill-1-case-one"
    assert task_name("skill-2") == "pagopa/skill-2"


def test_overlay_replaces_a_generated_file(skill: Path, tmp_path: Path):
    source = tmp_path / "override-solve.sh"
    source.write_text("#!/bin/sh\necho overridden\n")
    task_root = tmp_path / "task"
    generate_task(
        make_spec(skill, overlay={"solution/solve.sh": source}), task_root
    )
    assert (task_root / "solution" / "solve.sh").read_text() == (
        "#!/bin/sh\necho overridden\n"
    )
    # non-overlaid files keep their generated content
    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert toml["task"]["name"] == "pagopa/test-skill-1-case-one"


def test_overlay_adds_files_into_environment(skill: Path, tmp_path: Path):
    prepare = tmp_path / "prepare.sh"
    prepare.write_text("#!/bin/sh\necho prepared\n")
    data = tmp_path / "seed.csv"
    data.write_text("a,b\n")
    task_root = tmp_path / "task"
    generate_task(
        make_spec(
            skill,
            overlay={
                "environment/prepare.sh": prepare,
                "environment/data/seed.csv": data,
            },
        ),
        task_root,
    )
    # extra files land in the container context/workspace ...
    assert (task_root / "environment" / "prepare.sh").read_text() == (
        "#!/bin/sh\necho prepared\n"
    )
    assert (task_root / "environment" / "data" / "seed.csv").read_text() == "a,b\n"
    # ... and the generated Dockerfile still runs a prepare.sh when present
    dockerfile = (task_root / "environment" / "Dockerfile").read_text()
    assert "prepare.sh" in dockerfile


def test_overlay_cannot_clobber_a_per_eval_fixture(skill: Path, tmp_path: Path):
    # a per-eval fixture staged from evals.json may not be silently overridden
    fixture = tmp_path / "seed.txt"
    fixture.write_text("from evals")
    overlay_source = tmp_path / "seed-override.txt"
    overlay_source.write_text("from overlay")

    evals, _ = load_evals_file(skill / "evals" / "evals.json")
    resolved = resolve_eval_paths(evals, skill)
    resolved[1]["files"] = [fixture]

    with pytest.raises(WorkspaceError, match="overwrite a per-eval fixture"):
        generate_task(
            make_spec(
                skill,
                paths=resolved[1],
                overlay={"environment/seed.txt": overlay_source},
            ),
            tmp_path / "task",
        )


def test_run_level_overrides_reapplied_over_final_task_toml(
    skill: Path, tmp_path: Path
):
    task_root = tmp_path / "task"
    generate_task(
        make_spec(
            skill,
            run_level_overrides={
                "verifier": {"env": {"SKILL_EVAL_ENFORCE_SKILL_USE": "false"}}
            },
        ),
        task_root,
    )
    toml = tomllib.loads((task_root / "task.toml").read_text())
    assert toml["verifier"]["env"]["SKILL_EVAL_ENFORCE_SKILL_USE"] == "false"
    # converter defaults survive the re-application
    assert toml["schema_version"] == "1.4"


def test_run_level_overrides_win_over_an_overridden_task_toml(
    skill: Path, tmp_path: Path
):
    toml_source = tmp_path / "task.toml"
    toml_source.write_text("[agent]\ntimeout_sec = 42.0\n")
    task_root = tmp_path / "task"
    generate_task(
        make_spec(
            skill,
            overlay={"task.toml": toml_source},
            run_level_overrides={
                "verifier": {"env": {"SKILL_EVAL_ENFORCE_SKILL_USE": "false"}}
            },
        ),
        task_root,
    )
    toml = tomllib.loads((task_root / "task.toml").read_text())
    # the author's full replacement survives ...
    assert toml["agent"] == {"timeout_sec": 42.0}
    # ... and the run-level gate is re-applied on top
    assert toml["verifier"]["env"]["SKILL_EVAL_ENFORCE_SKILL_USE"] == "false"


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


def test_per_eval_fixture_named_like_generated_file_is_rejected(
    skill: Path, tmp_path: Path
):
    # a per-eval fixture cannot silently shadow the generated environment
    # Dockerfile: customization goes through the harbor/ overlay instead
    fixture_dir = tmp_path / "fixtures"
    fixture_dir.mkdir()
    dockerfile_fixture = fixture_dir / "Dockerfile"
    dockerfile_fixture.write_text("FROM nope\n")

    evals, _ = load_evals_file(skill / "evals" / "evals.json")
    resolved = resolve_eval_paths(evals, skill)
    resolved[1]["files"] = [dockerfile_fixture]

    with pytest.raises(WorkspaceError, match="generated environment file"):
        generate_task(make_spec(skill, paths=resolved[1]), tmp_path / "task")
