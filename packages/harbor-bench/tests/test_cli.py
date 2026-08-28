"""Adapter tests for the ``harbor-bench`` CLI.

Argparse wiring, exit codes, stderr error formatting, and host preflight
ordering. The workflow invariants themselves are covered by
``tests/test_convert_run.py`` through the plan/apply seam, and the report
rendering by ``tests/test_diff.py``.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pytest
import yaml

from harbor_bench.cli import build_parser, cmd_diff, cmd_convert

from tests.conftest import CASE_ONE, write_evals


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


def test_parser_rejects_unknown_environment():
    with pytest.raises(SystemExit):
        build_parser().parse_args(["convert", "--environment", "podman"])


def test_convert_success_returns_zero(tmp_path: Path):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill)
    out = tmp_path / "out"
    assert cmd_convert(convert_args(out, [str(evals_path)])) == 0
    assert (out / "config.yaml").is_file()


def test_convert_preflight_failure_fails_fast(tmp_path: Path, monkeypatch, capsys):
    def fake_check(environment: str) -> str | None:
        assert environment == "apple-container"
        return "Apple Container requires the 'container' CLI to be installed."

    monkeypatch.setattr("harbor_bench.cli.check_host_environment", fake_check)
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


def test_convert_apple_container_environment(tmp_path: Path, monkeypatch):
    # The host may lack the `container` CLI; the prerequisite check is a
    # separate, host-dependent concern (covered by its own tests).
    monkeypatch.setattr("harbor_bench.cli.check_host_environment", lambda environment: None)
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


def test_convert_prints_plan_error_to_stderr(tmp_path: Path, capsys):
    skill = tmp_path / "skill"
    evals_path = write_evals(skill)
    other = tmp_path / "other"
    evals_b = write_evals(other, skill_name="test-skill", cases=[CASE_ONE])
    out = tmp_path / "out"
    rc = cmd_convert(convert_args(out, [str(evals_path), str(evals_b)]))
    assert rc == 1
    assert "duplicate task name" in capsys.readouterr().err
    assert not (out / "tasks").exists()
    assert not (out / "config.yaml").exists()


def diff_args(base: Path, head: Path, **overrides) -> argparse.Namespace:
    base_args = dict(base=str(base), head=str(head), format="markdown", report=None)
    base_args.update(overrides)
    return argparse.Namespace(**base_args)


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


def test_diff_defaults_to_markdown(tmp_path, capsys):
    base = tmp_path / "job-a"
    head = tmp_path / "job-b"
    write_result(base, "task-a", 0.8)
    write_result(head, "task-a", 0.95)

    assert cmd_diff(diff_args(base, head)) == 0
    out = capsys.readouterr().out
    assert "# Skill comparison" in out
    assert "| metric | base | head | Δ |" in out


def test_diff_json_prints_parseable_document(tmp_path, capsys):
    base = tmp_path / "job-a"
    head = tmp_path / "job-b"
    write_result(base, "task-a", 0.8)
    write_result(head, "task-a", 0.95)

    assert cmd_diff(diff_args(base, head, format="json")) == 0
    doc = json.loads(capsys.readouterr().out)
    assert doc["base_job"] == str(base)
    assert doc["tasks"][0]["task"] == "task-a"
    assert doc["tasks"][0]["head"]["score.quality"] == 0.95


def test_diff_json_report_writes_file(tmp_path, capsys):
    base = tmp_path / "job-a"
    head = tmp_path / "job-b"
    write_result(base, "task-a", 0.8)
    write_result(head, "task-a", 0.95)

    out = tmp_path / "out.json"
    assert cmd_diff(diff_args(base, head, format="json", report=str(out))) == 0
    doc = json.loads(out.read_text())
    assert doc["summary"]["head_tasks"] == 1
    assert ">> comparison report" in capsys.readouterr().out
