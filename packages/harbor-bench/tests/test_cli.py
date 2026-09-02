"""Adapter tests for the ``harbor-bench`` CLI.

Argparse wiring, exit codes, stderr error formatting, and host preflight
ordering. The workflow invariants themselves are covered by
``tests/test_convert_run.py`` through the plan/apply seam, and the report
rendering by ``tests/test_diff.py``.
"""

from __future__ import annotations

import argparse
import json
import types
from pathlib import Path

import pytest
import yaml

from harbor_bench.cli import build_parser, cmd_compare, cmd_diff, cmd_convert
from harbor_bench.compare.run import CompareError

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


def test_parser_accepts_html_diff_format():
    args = build_parser().parse_args(["diff", "base", "head", "--format", "html"])
    assert args.format == "html"


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
    assert load_config(out)["environment"] == {
        "type": "apple-container",
        "delete": False,
    }


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


def test_diff_html_report_writes_self_contained_file(tmp_path, capsys):
    base = tmp_path / "job-a"
    head = tmp_path / "job-b"
    write_result(base, "task-a", 0.8)
    write_result(head, "task-a", 0.95)

    out = tmp_path / "out.html"
    assert cmd_diff(diff_args(base, head, format="html", report=str(out))) == 0
    html = out.read_text()
    assert html.startswith("<!doctype html>")
    assert "<style>" in html
    assert "task-a" in html
    assert ">> comparison report" in capsys.readouterr().out


def test_diff_html_report_includes_incomplete_trials(tmp_path, capsys):
    base = tmp_path / "job-a"
    head = tmp_path / "job-b"
    base_trial = base / "task-a__base123"
    head_trial = head / "task-a__head456"
    base_trial.mkdir(parents=True)
    head_trial.mkdir(parents=True)
    (base_trial / "trial.log").write_text("interrupted", encoding="utf-8")
    (head_trial / "trial.log").write_text("interrupted", encoding="utf-8")

    out = tmp_path / "out.html"
    assert cmd_diff(diff_args(base, head, format="html", report=str(out))) == 0
    html = out.read_text()

    assert "task-a" in html
    assert "Incomplete" in html
    assert "No completed comparable results" in html
    assert ">> comparison report" in capsys.readouterr().out


def compare_args(base: str, head: str, **overrides) -> argparse.Namespace:
    base_args = dict(
        base=base,
        head=head,
        task_patterns=[],
        scan_root=None,
        out=None,
        runs_dir=None,
        run_id=None,
        environment="docker",
        model="gpt-5.6-luna",
        n_concurrent=4,
        task_glob=None,
        token=None,
        format="markdown",
    )
    base_args.update(overrides)
    return argparse.Namespace(**base_args)


def test_parser_exposes_compare_subcommand():
    args = build_parser().parse_args(
        [
            "compare",
            "-t",
            "skill-a-*",
            "-t",
            "skill-b-*",
            "plugins/aiepdf/skills/dr-blacksmith",
            "pagopa/dx@main",
        ]
    )
    assert args.base == "plugins/aiepdf/skills/dr-blacksmith"
    assert args.head == "pagopa/dx@main"
    assert args.task_patterns == ["skill-a-*", "skill-b-*"]


def test_compare_returns_zero_and_prints_summary(tmp_path, monkeypatch, capsys):
    run_dir = tmp_path / "runs" / "run-1"
    result = types.SimpleNamespace(
        run_dir=run_dir,
        base_job=run_dir / "base",
        head_job=run_dir / "head",
        report=run_dir / "comparison.md",
    )
    monkeypatch.setattr("harbor_bench.cli.run_compare", lambda options: result)
    assert cmd_compare(compare_args("base", "head")) == 0
    out = capsys.readouterr().out
    assert ">> done." in out
    assert ">>   report: " in out


def test_compare_maps_compare_error_to_stderr(tmp_path, monkeypatch, capsys):
    def boom(options):
        raise CompareError("no evals.json found")

    monkeypatch.setattr("harbor_bench.cli.run_compare", boom)
    assert cmd_compare(compare_args("base", "head")) == 1
    assert "error: no evals.json found" in capsys.readouterr().err


def test_compare_flags_map_to_options(tmp_path, monkeypatch, capsys):
    # CLI flags are the only source of configuration: no env fallbacks.
    seen: dict = {}
    run_dir = tmp_path / "runs" / "run-1"
    fake = types.SimpleNamespace(
        run_dir=run_dir,
        base_job=run_dir / "base",
        head_job=run_dir / "head",
        report=run_dir / "comparison.md",
    )
    def capture(options):
        seen["options"] = options
        return fake

    monkeypatch.setattr("harbor_bench.cli.run_compare", capture)
    args = build_parser().parse_args(
        [
            "compare",
            "--scan-root",
            str(tmp_path / "scans"),
            "--out",
            str(tmp_path / "harbor-out"),
            "--runs-dir",
            str(tmp_path / "run-parent"),
            "--run-id",
            "stable-id",
            "--task-glob",
            "skill-a-* skill-b-*",
            "--model",
            "gpt-5.6-luna",
            "--n-concurrent",
            "8",
            "--format",
            "json",
            "--token",
            "tok-cli",
            "base",
            "head",
        ]
    )
    assert cmd_compare(args) == 0
    opts = seen["options"]
    assert opts.scan_root == tmp_path / "scans"
    assert opts.out == tmp_path / "harbor-out"
    assert opts.runs_dir == tmp_path / "run-parent"
    assert opts.run_id == "stable-id"
    assert opts.task_globs == ("skill-a-*", "skill-b-*")
    assert opts.n_concurrent == 8
    assert opts.report_format == "json"
    assert opts.token == "tok-cli"
