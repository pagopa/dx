"""Tests for the compare workflow: run_compare and its helpers.

The orchestration is exercised through its seam (:func:`run_compare`) with the
host-dependent and external pieces monkeypatched (harbor CLI preflight, the
convert plan/apply seam, ``harbor run``), while the config filter, command
building, and run-failure handling are asserted directly.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
import yaml

from harbor_bench.compare.run import (
    CompareError,
    CompareOptions,
    HarborRunError,
    check_harbor_cli,
    run_compare,
)
from harbor_bench.compare.run import _run_command, _run_job, _write_run_config
from harbor_bench.compare.sources import SkillSource

from tests.conftest import write_evals


def make_skill(tmp_path: Path, name: str) -> Path:
    path = tmp_path / name
    path.mkdir()
    (path / "SKILL.md").write_text("# skill", encoding="utf-8")
    return path


def write_result(job_dir: Path, task: str, quality: float) -> None:
    trial = job_dir / task
    trial.mkdir(parents=True, exist_ok=True)
    (trial / "result.json").write_text(
        json.dumps(
            {
                "task_name": task,
                "verifier_result": {"rewards": {"quality": quality}},
            }
        )
    )


def options(tmp_path: Path, **overrides) -> CompareOptions:
    base = dict(
        base_skill=str(make_skill(tmp_path, "base-skill")),
        head_skill=str(make_skill(tmp_path, "head-skill")),
        scan_root=tmp_path / "plugins",
        out=tmp_path / "out",
        runs_dir=tmp_path / "runs",
        run_id="run-1",
        environment="docker",
        model="gpt-5.6-luna",
        n_concurrent=4,
        task_patterns=(),
        task_globs=(),
        token=None,
        harbor="harbor",
    )
    base.update(overrides)
    return CompareOptions(**base)


# --- preflight -----------------------------------------------------------


def test_check_harbor_cli_found(monkeypatch):
    monkeypatch.setattr(
        "harbor_bench.compare.run.shutil.which", lambda name: "/usr/bin/harbor"
    )
    assert check_harbor_cli("harbor") is None


def test_check_harbor_cli_missing(monkeypatch):
    monkeypatch.setattr(
        "harbor_bench.compare.run.shutil.which", lambda name: None
    )
    err = check_harbor_cli("harbor")
    assert err is not None and "not found on PATH" in err


# --- config filter -------------------------------------------------------


def test_write_run_config_copies_verbatim_for_all_tasks(tmp_path: Path):
    config = tmp_path / "config.yaml"
    config.write_text("datasets:\n  - path: tasks\n", encoding="utf-8")
    out = tmp_path / "config.run.yaml"
    _write_run_config(config, out, ("*",))
    assert out.read_bytes() == config.read_bytes()
    assert "task_names" not in yaml.safe_load(out.read_text())["datasets"][0]


def test_write_run_config_narrows_task_names(tmp_path: Path):
    config = tmp_path / "config.yaml"
    config.write_text("datasets:\n  - path: tasks\n", encoding="utf-8")
    out = tmp_path / "config.run.yaml"
    _write_run_config(config, out, ("skill-a-*", "skill-b-*"))
    data = yaml.safe_load(out.read_text())
    assert data["datasets"][0]["task_names"] == ["skill-a-*", "skill-b-*"]


def test_write_run_config_tolerates_missing_datasets(tmp_path: Path):
    config = tmp_path / "config.yaml"
    config.write_text("agents: []\n", encoding="utf-8")
    out = tmp_path / "config.run.yaml"
    _write_run_config(config, out, ("skill-a-*",))
    assert yaml.safe_load(out.read_text())["datasets"] == []


# --- harbor run command --------------------------------------------------


def test_run_command_construction(tmp_path: Path):
    skill = SkillSource(
        value="pagopa/dx@main",
        kind="git",
        reference="pagopa/dx@main",
        name=None,
    )
    cmd = _run_command(
        "harbor", tmp_path / "config.yaml", tmp_path / "runs", "base", skill, None
    )
    assert cmd == [
        "harbor",
        "run",
        "-c",
        str(tmp_path / "config.yaml"),
        "-y",
        "--jobs-dir",
        str(tmp_path / "runs"),
        "--job-name",
        "base",
        "--skill",
        "pagopa/dx@main",
    ]


def test_run_command_injects_token(tmp_path: Path):
    skill = SkillSource(
        value="pagopa/dx@main",
        kind="git",
        reference="pagopa/dx@main",
        name=None,
    )
    cmd = _run_command(
        "harbor", tmp_path / "config.yaml", tmp_path / "runs", "head", skill, "gh-tok"
    )
    assert "--ae" in cmd
    assert "COPILOT_GITHUB_TOKEN=gh-tok" in cmd


def test_run_command_without_token_omits_ae(tmp_path: Path):
    skill = SkillSource(
        value="pagopa/dx@main",
        kind="git",
        reference="pagopa/dx@main",
        name=None,
    )
    cmd = _run_command(
        "harbor", tmp_path / "config.yaml", tmp_path / "runs", "base", skill, None
    )
    assert "--ae" not in cmd


# --- sequential run ------------------------------------------------------


def test_run_job_streams_output_and_raises_on_failure(tmp_path: Path, monkeypatch, capsys):
    """``harbor run`` output is passed through (no log file) and a non-zero
    exit raises :class:`HarborRunError`."""
    result = type("Result", (), {"returncode": 7})()
    monkeypatch.setattr(
        "harbor_bench.compare.run.subprocess.run", lambda command: result
    )
    skill = SkillSource(
        value="pagopa/dx@main",
        kind="git",
        reference="pagopa/dx@main",
        name=None,
    )
    with pytest.raises(HarborRunError, match=r"\[base\] harbor run failed \(exit 7\)"):
        _run_job("harbor", tmp_path / "config.yaml", tmp_path / "runs", "base", skill, None)
    assert not (tmp_path / "runs" / "base.log").exists()
    assert ">> [base] harbor run --skill pagopa/dx@main" in capsys.readouterr().out


# --- run_compare ---------------------------------------------------------


def test_run_compare_preflights_harbor_cli(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(
        "harbor_bench.compare.run.check_harbor_cli", lambda harbor: "harbor not found"
    )
    with pytest.raises(CompareError, match="harbor not found"):
        run_compare(options(tmp_path))


def test_run_compare_requires_evals(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(
        "harbor_bench.compare.run.check_harbor_cli", lambda harbor: None
    )
    monkeypatch.setattr(
        "harbor_bench.compare.run.check_host_environment", lambda environment: None
    )
    with pytest.raises(CompareError, match="no evals.json"):
        run_compare(options(tmp_path))


def test_run_compare_full_flow(tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setattr(
        "harbor_bench.compare.run.check_harbor_cli", lambda harbor: None
    )
    monkeypatch.setattr(
        "harbor_bench.compare.run.check_host_environment", lambda environment: None
    )
    skill_dir = tmp_path / "plugins" / "aiepdf" / "skills" / "test-skill"
    write_evals(skill_dir)

    out = tmp_path / "out"
    config_yaml = out / "config.yaml"

    class FakePlan:
        tasks = ("t1",)
        config_out = config_yaml

    def fake_apply_run(plan):
        config_yaml.parent.mkdir(parents=True, exist_ok=True)
        config_yaml.write_text("datasets:\n  - path: tasks\n", encoding="utf-8")

    monkeypatch.setattr("harbor_bench.compare.run.plan_run", lambda opts: FakePlan())
    monkeypatch.setattr("harbor_bench.compare.run.apply_run", fake_apply_run)

    def fake_run_job(harbor, config, jobs_dir, label, skill, token):
        write_result(jobs_dir / label, "test-skill-1-case-one", 0.8 if label == "base" else 0.95)

    monkeypatch.setattr("harbor_bench.compare.run._run_job", fake_run_job)

    result = run_compare(options(tmp_path))

    # run config carries the derived skill-name globs
    run_config = yaml.safe_load((out / "config.run.yaml").read_text())
    assert run_config["datasets"][0]["task_names"] == ["base-skill-*", "head-skill-*"]

    # jobs landed under runs/<run-id>/{base,head}
    assert result.base_job == tmp_path / "runs" / "run-1" / "base"
    assert result.head_job == tmp_path / "runs" / "run-1" / "head"
    assert (result.base_job / "test-skill-1-case-one" / "result.json").is_file()

    # report written by the real diff seam
    report = result.report.read_text(encoding="utf-8")
    assert "# Skill comparison" in report
    assert "test-skill-1-case-one" in report

    captured = capsys.readouterr().out
    assert ">> found 1 evals.json" in captured
    assert ">> task filter: base-skill-* head-skill-*" in captured


def test_run_compare_sequential_uses_one_run_per_job(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(
        "harbor_bench.compare.run.check_harbor_cli", lambda harbor: None
    )
    monkeypatch.setattr(
        "harbor_bench.compare.run.check_host_environment", lambda environment: None
    )
    skill_dir = tmp_path / "plugins" / "aiepdf" / "skills" / "test-skill"
    write_evals(skill_dir)

    out = tmp_path / "out"

    class FakePlan:
        tasks = ("t1",)
        config_out = out / "config.yaml"

    def fake_apply_run(plan):
        plan.config_out.parent.mkdir(parents=True, exist_ok=True)
        plan.config_out.write_text("datasets:\n  - path: tasks\n", encoding="utf-8")

    monkeypatch.setattr("harbor_bench.compare.run.plan_run", lambda opts: FakePlan())
    monkeypatch.setattr("harbor_bench.compare.run.apply_run", fake_apply_run)

    calls: list[tuple[str, str]] = []

    def fake_run_job(harbor, config, jobs_dir, label, skill, token):
        calls.append((label, skill.reference))
        write_result(jobs_dir / label, "test-skill-1-case-one", 0.8)

    monkeypatch.setattr("harbor_bench.compare.run._run_job", fake_run_job)

    result = run_compare(options(tmp_path, task_patterns=("test-skill-*",)))
    assert calls == [
        ("base", str(tmp_path / "base-skill")),
        ("head", str(tmp_path / "head-skill")),
    ]
    assert result.globs == ("test-skill-*",)
