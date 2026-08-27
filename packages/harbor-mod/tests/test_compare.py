"""Tests for the two-job comparison report (harbor-mod compare)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from harbor_mod.compare import build_report, load_job, render_markdown

AGENT_TIMES = ("2026-08-27T10:00:00+00:00", "2026-08-27T10:05:00+00:00")
TOTAL_TIMES = ("2026-08-27T10:00:00+00:00", "2026-08-27T10:07:00+00:00")


def _write_trial(
    job_dir: Path,
    task: str,
    *,
    rewards: dict[str, float | int] | None = None,
    tokens: tuple[int, int, int] | None = None,
    cost: float | None = None,
    exception: bool = False,
) -> None:
    trial = job_dir / task
    trial.mkdir(parents=True, exist_ok=True)
    agent_result = {
        "n_input_tokens": tokens[0] if tokens else None,
        "n_cache_tokens": tokens[1] if tokens else None,
        "n_output_tokens": tokens[2] if tokens else None,
        "cost_usd": cost,
    }
    data = {
        "task_name": task,
        "trial_name": f"{task}__abc1234",
        "agent_result": agent_result,
        "verifier_result": {"rewards": rewards or {}},
        "agent_execution": {
            "started_at": AGENT_TIMES[0],
            "finished_at": AGENT_TIMES[1],
        },
        "started_at": TOTAL_TIMES[0],
        "finished_at": TOTAL_TIMES[1],
    }
    if exception:
        data["exception_info"] = {
            "exception_type": "TimeoutError",
            "exception_message": "boom",
        }
    (trial / "result.json").write_text(json.dumps(data))


def _make_job(tmp_path: Path, name: str) -> Path:
    job = tmp_path / name
    job.mkdir(parents=True, exist_ok=True)
    return job


def test_load_job_parses_metrics(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(
        job,
        "skill-task-1",
        rewards={"quality": 0.9, "pass": 1},
        tokens=(1000, 200, 300),
        cost=0.05,
    )
    metrics = load_job(job)
    assert list(metrics) == ["skill-task-1"]
    m = metrics["skill-task-1"]
    assert m.rewards == {"quality": 0.9, "pass": 1}
    assert m.input_tokens == 1000
    assert m.cache_tokens == 200
    assert m.output_tokens == 300
    assert m.cost_usd == 0.05
    assert m.agent_duration_sec == 300.0
    assert m.total_duration_sec == 420.0
    assert m.passed is True


def test_load_job_marks_exception_as_failed(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "skill-task-1", exception=True)
    assert load_job(job)["skill-task-1"].passed is False


def test_load_job_missing_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_job(tmp_path / "nope")


def test_build_report_joins_by_task_and_computes_delta(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8}, tokens=(1000, 0, 100))
    _write_trial(head, "task-a", rewards={"quality": 0.95}, tokens=(1100, 50, 120))
    _write_trial(head, "task-only-head", rewards={"quality": 0.5})

    report = build_report(load_job(base), load_job(head))
    rows = {r["task"]: r for r in report["rows"]}
    assert set(rows) == {"task-a", "task-only-head"}
    assert rows["task-a"]["base"] is not None and rows["task-a"]["head"] is not None
    assert rows["task-only-head"]["base"] is None
    assert rows["task-only-head"]["head"] is not None


def test_render_markdown_includes_deltas(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8}, tokens=(1000, 0, 100))
    _write_trial(head, "task-a", rewards={"quality": 0.95}, tokens=(1100, 50, 120))

    md = render_markdown("run-base", "run-head", build_report(load_job(base), load_job(head)))
    assert "# Skill comparison: `run-base` → `run-head`" in md
    assert "### task-a" in md
    assert "score.quality" in md
    assert "input tokens" in md
    assert "0.95" in md  # head quality value
    assert "+0.150" in md or "+0.15" in md  # quality delta
    assert "+100" in md  # input token delta
    assert "passed trials" in md