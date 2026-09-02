"""Tests for the two-job comparison report (harbor-bench report)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from harbor_bench.diff import (
    MetricSpec,
    Report,
    TrialComparison,
    build_document,
    build_report,
    metric_specs,
    summarize,
)
from harbor_bench.jobs import Job, JobMeta, SkillVersion
from harbor_bench.report import render_html, render_json, render_markdown

from tests.conftest import DEFAULT_USAGE_ROW, write_copilot_jsonl, write_session_db

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
    verifier: tuple[str, str] | None = None,
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
    if verifier is not None:
        data["verifier"] = {"started_at": verifier[0], "finished_at": verifier[1]}
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


def test_job_metrics_parses_metrics(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(
        job,
        "skill-task-1",
        rewards={"quality": 0.9, "pass": 1},
        tokens=(1000, 200, 300),
        cost=0.05,
    )
    metrics = Job(job).metrics()
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


def test_job_metrics_marks_exception_as_failed(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "skill-task-1", exception=True)
    assert Job(job).metrics()["skill-task-1"].passed is False


def test_job_metrics_missing_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        Job(tmp_path / "nope").metrics()


def test_job_seam_serves_metrics_and_meta(tmp_path):
    """One Job read serves both the per-task metrics and the job meta."""
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", rewards={"quality": 0.9}, tokens=(1000, 200, 300))
    _write_meta_trial(
        job,
        "task-b",
        agent_model="gpt-5.6-luna",
        agent_effort="high",
        skills=["/some/local/dr-blacksmith"],
    )

    read = Job(job)
    metrics = read.metrics()
    meta = read.meta()

    assert set(metrics) == {"task-a", "task-b"}
    assert metrics["task-a"].input_tokens == 1000
    assert meta is not None
    assert meta.agent_model == "gpt-5.6-luna"
    assert meta.agent_effort == "high"
    assert meta.skills and meta.skills[0].name == "dr-blacksmith"


def test_job_reads_result_json_once_across_metrics_and_meta(tmp_path, monkeypatch):
    """One Job serves both derivations without re-parsing result.json.

    The deepened seam caches the ordered trial list, so each trial's
    result.json parses exactly once — shared by metrics() and meta().
    """
    real_loads = json.loads
    calls = 0

    def counting_loads(*args, **kwargs):
        nonlocal calls
        calls += 1
        return real_loads(*args, **kwargs)

    monkeypatch.setattr(json, "loads", counting_loads)

    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", rewards={"quality": 0.9}, tokens=(1000, 200, 300))
    _write_meta_trial(
        job,
        "task-b",
        agent_model="gpt-5.6-luna",
        agent_effort="high",
        skills=["/some/local/dr-blacksmith"],
    )

    read = Job(job)
    metrics = read.metrics()
    meta = read.meta()

    assert set(metrics) == {"task-a", "task-b"}
    assert meta is not None and meta.agent_model == "gpt-5.6-luna"
    assert calls == 2  # one parse per trial, shared by both derivations


def test_trial_artifacts_owns_the_trial_layout(tmp_path):
    """The trial-directory layout lives in one value, resolved from the root."""
    from harbor_bench.jobs import TrialArtifacts

    trial_dir = tmp_path / "task-1"
    artifacts = TrialArtifacts.for_trial(trial_dir)
    assert artifacts.result == trial_dir / "result.json"
    assert artifacts.trajectory == trial_dir / "agent" / "trajectory.json"
    assert artifacts.verifier_usage == trial_dir / "verifier" / "usage.jsonl"
    assert artifacts.reward_details == trial_dir / "verifier" / "reward-details.json"
    assert artifacts.copilot_session_db == trial_dir / "agent" / "copilot" / "session-store.db"
    assert artifacts.copilot_cli_jsonl == trial_dir / "agent" / "copilot-cli.jsonl"


def test_job_metrics_uses_agent_persisted_metadata(tmp_path):
    """The mod agent's persisted values win; artifacts only backfill the rest.

    The agent writes n_requests/n_reasoning_tokens under
    agent_result.metadata (see CopilotCliMod.populate_context_post_run), so a
    trial produced by the mod agent is read from result.json without touching
    the artifacts. The artifacts backfill only what the file cannot report.
    """
    job = _make_job(tmp_path, "run-a")
    trial = job / "task-a"
    trial.mkdir(parents=True, exist_ok=True)
    data = {
        "task_name": "task-a",
        "trial_name": "task-a__abc1234",
        "agent_result": {
            "metadata": {
                "n_requests": 4,
                "n_reasoning_tokens": 120,
            }
        },
    }
    (trial / "result.json").write_text(json.dumps(data))
    # artifacts that would claim different numbers, but must NOT win for the
    # persisted fields; they only backfill the ones result.json cannot report.
    write_session_db(
        trial / "agent" / "copilot" / "session-store.db",
        rows=[(20_474, 7_000, 20_471, 41, 20, 516_755_000)],
    )
    m = Job(job).metrics()["task-a"]
    assert m.n_requests == 4  # persisted metadata beats the DB's 1
    assert m.reasoning_tokens == 120  # persisted metadata beats the DB's 20
    assert m.input_tokens == 20_474  # not persisted; backfilled from the DB
    assert m.cache_tokens == 7_000  # not persisted; backfilled from the DB


def test_trial_task_name_falls_back_to_dir_name(tmp_path):
    job = _make_job(tmp_path, "run-a")
    trial_dir = job / "nameless"
    trial_dir.mkdir(parents=True, exist_ok=True)
    (trial_dir / "result.json").write_text(json.dumps({"verifier_result": {}}))
    trial = next(Job(job).iter_trials())
    assert trial.task_name == "nameless"


def test_trial_metrics_and_meta_typed_interface(tmp_path):
    """The Trial seam exposes typed accessors, not the raw result.json dict."""
    job = _make_job(tmp_path, "run-a")
    _write_trial(
        job,
        "task-a",
        rewards={"quality": 0.9, "pass": 1},
        tokens=(1000, 200, 300),
        cost=0.05,
    )
    _write_meta_trial(
        job,
        "task-b",
        agent_model="gpt-5.6-luna",
        agent_effort="high",
        skills=["/some/local/dr-blacksmith"],
        judge_model="openai/gpt-5.6-luna",
        judge_effort="medium",
    )
    by_task = {trial.task_name: trial for trial in Job(job).iter_trials()}

    metrics = by_task["task-a"].metrics()
    assert metrics.rewards == {"quality": 0.9, "pass": 1}
    assert metrics.input_tokens == 1000
    assert metrics.cache_tokens == 200
    assert metrics.output_tokens == 300
    assert metrics.cost_usd == 0.05
    assert metrics.agent_duration_sec == 300.0
    assert metrics.total_duration_sec == 420.0
    assert metrics.passed is True
    assert metrics.rewards["quality"] == 0.9

    meta = by_task["task-b"].meta()
    assert meta.agent_model == "gpt-5.6-luna"
    assert meta.agent_effort == "high"
    assert meta.judge_model == "openai/gpt-5.6-luna"
    assert meta.judge_effort == "medium"
    assert meta.skills and meta.skills[0].name == "dr-blacksmith"


def test_trial_metrics_raise_and_meta_tolerate_corrupt_result(tmp_path):
    """metrics() is a hard read; meta() is best-effort over a bad result.json."""
    job = _make_job(tmp_path, "run-a")
    trial_dir = job / "task-a"
    trial_dir.mkdir(parents=True, exist_ok=True)
    (trial_dir / "result.json").write_text("{not json")

    trial = next(Job(job).iter_trials())
    with pytest.raises(json.JSONDecodeError):
        trial.metrics()
    meta = trial.meta()
    assert meta is not None
    assert meta.agent_model is None


def _specs_for(report: Report) -> list[MetricSpec]:
    base_map = {r.task: r.base for r in report.rows if r.base}
    head_map = {r.task: r.head for r in report.rows if r.head}
    return metric_specs(base_map, head_map)


def test_build_document_computes_specs_summary_and_diffs_once(tmp_path, monkeypatch):
    """The document concentrates the compute the renderers used to redo.

    Specs (static registry + reward keys), the aggregated summary, and the
    git-diff selection are all decided by build_document, so the renderers are
    pure adapters over one value.
    """
    import harbor_bench.jobs as jobs

    home = tmp_path / "home"
    monkeypatch.setattr(jobs, "_GIT_CACHE_PREFIX", home / ".cache" / "harbor" / "skills")
    git_skill = str(home / ".cache" / "harbor" / "skills" / _GIT_SKILL)
    job = _make_job(tmp_path, "run-a")
    _write_meta_trial(
        job,
        "task-meta",
        agent_model="gpt-5.6-luna",
        agent_effort="high",
        skills=["/some/local/dr-blacksmith", git_skill],
        judge_model="openai/gpt-5.6-luna",
        judge_effort="medium",
    )
    meta = Job(job).meta()

    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8}, tokens=(1000, 200, 300))
    _write_trial(head, "task-a", rewards={"quality": 0.95}, tokens=(1100, 250, 320))

    document = build_document(
        "run-base",
        "run-head",
        build_report(Job(base).metrics(), Job(head).metrics()),
        base_meta=meta,
        head_meta=meta,
    )
    assert [s.key for s in document.specs][:1] == ["score.quality"]
    assert "input_tokens" in [s.key for s in document.specs]
    assert document.summary.head_tasks == 1
    assert document.summary.base_passed == 1
    # both sides carry the same git-loaded skill, so each produces a diff row
    assert len(document.skill_diffs) == 2
    assert document.skill_diffs[0].command.startswith("git -C ")
    # The renderers derive nothing: they only format the document.
    md = render_markdown(document)
    jdoc = json.loads(render_json(document))
    assert "score.quality" in md
    assert jdoc["tasks"][0]["head"]["score.quality"] == 0.95
    assert jdoc["summary"]["head_tasks"] == 1


def test_summarize_aggregates_numbers(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8}, tokens=(1000, 0, 100), cost=0.5)
    _write_trial(base, "task-b", rewards={"quality": 0.6}, tokens=(2000, 100, 200), cost=0.3)
    _write_trial(head, "task-a", rewards={"quality": 0.95}, tokens=(1100, 50, 120), cost=0.8)

    report = build_report(Job(base).metrics(), Job(head).metrics())
    summary = summarize(report, _specs_for(report))

    assert summary.base_tasks == 2
    assert summary.head_tasks == 1
    assert summary.base_only == 1  # task-b ran only in base
    assert summary.head_only == 0
    assert summary.base_passed == 2
    assert summary.head_passed == 1

    by_key = {line.spec.key: line for line in summary.lines}
    assert by_key["input_tokens"].base == 3000  # summed, int
    assert by_key["input_tokens"].head == 1100
    assert by_key["cost_usd"].base == 0.8  # summed, float
    assert by_key["cost_usd"].head == 0.8
    assert by_key["score.quality"].base == 0.7  # mean of 0.8, 0.6
    assert by_key["score.quality"].head == 0.95


def test_metric_spec_aggregate_honors_kind_and_integer():
    totals_int = MetricSpec("n_steps", "total", integer=True)
    totals_float = MetricSpec("cost_usd", "total")
    averaged = MetricSpec("agent_duration_sec", "mean")
    score = MetricSpec("score.quality", "score")

    assert totals_int.aggregate([1, 2, 3]) == 6
    assert totals_int.aggregate([1.5, 2.5]) == 4  # int-forced sum
    assert totals_float.aggregate([0.5, 0.25]) == 0.75
    assert averaged.aggregate([10, 20]) == 15.0
    assert score.aggregate([0.8, 0.6]) == 0.7
    assert totals_int.aggregate([]) is None
    assert totals_int.summary_word == "total"
    assert averaged.summary_word == "mean"


def test_build_report_joins_by_task_and_computes_delta(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8}, tokens=(1000, 0, 100))
    _write_trial(head, "task-a", rewards={"quality": 0.95}, tokens=(1100, 50, 120))
    _write_trial(head, "task-only-head", rewards={"quality": 0.5})

    report = build_report(Job(base).metrics(), Job(head).metrics())
    rows = {r.task: r for r in report.rows}
    assert set(rows) == {"task-a", "task-only-head"}
    assert rows["task-a"].base is not None and rows["task-a"].head is not None
    assert rows["task-only-head"].base is None
    assert rows["task-only-head"].head is not None


def test_report_rows_are_typed_trial_comparisons(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8})
    _write_trial(head, "task-a", rewards={"quality": 0.95})
    _write_trial(head, "task-only-head", rewards={"quality": 0.5})

    report = build_report(Job(base).metrics(), Job(head).metrics())
    assert isinstance(report, Report)
    assert len(report.rows) == 2
    task_a = next(r for r in report.rows if r.task == "task-a")
    assert isinstance(task_a, TrialComparison)
    assert task_a.base is not None and task_a.head is not None
    only_head = next(r for r in report.rows if r.task == "task-only-head")
    assert only_head.base is None and only_head.head is not None


def test_metric_specs_orders_scores_before_static_metrics(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8, "pass": 1}, tokens=(1, 2, 3))
    _write_trial(head, "task-a", rewards={"quality": 0.9, "pass": 1}, tokens=(1, 2, 3))

    specs = metric_specs(Job(base).metrics(), Job(head).metrics())
    assert [s.key for s in specs] == [
        "score.pass",
        "score.quality",
        "input_tokens",
        "cache_tokens",
        "output_tokens",
        "reasoning_tokens",
        "n_requests",
        "n_steps",
        "cost_usd",
        "verifier_tokens",
        "agent_duration_sec",
        "total_duration_sec",
        "verifier_duration_sec",
    ]
    assert specs[0].kind == "score"
    assert specs[0].display_label == "score.pass"


def test_metric_registry_owns_derivation_and_reporting():
    """One registry carries both halves: what jobs backfills and what is reported."""
    from harbor_bench.metrics import METRIC_SPECS, derivable_specs

    by_key = {spec.key: spec for spec in METRIC_SPECS}
    # derivation half: result.json key wins, usage attribute backfills
    assert by_key["input_tokens"].result_key == "n_input_tokens"
    assert by_key["input_tokens"].usage_attr == "input_tokens"
    assert by_key["cache_tokens"].usage_attr == "cache_read_tokens"
    assert by_key["cost_usd"].result_key == "cost_usd"
    assert [s.key for s in derivable_specs()] == [
        "input_tokens",
        "cache_tokens",
        "output_tokens",
        "reasoning_tokens",
        "n_requests",
        "cost_usd",
    ]
    # reporting half: kind/label/int unchanged by the derivation move
    assert by_key["cost_usd"].kind == "total"
    assert by_key["cost_usd"].integer is False
    assert by_key["agent_duration_sec"].kind == "mean"
    assert by_key["n_steps"].integer is True
    assert by_key["n_steps"].result_key is None


def test_metric_registry_drives_summary_aggregation(tmp_path, monkeypatch):
    """The registry, not a hardcoded list, decides total vs mean in the summary."""
    import harbor_bench.diff as diff_mod

    monkeypatch.setattr(
        diff_mod,
        "METRIC_SPECS",
        tuple(
            diff_mod.MetricSpec(s.key, "mean", s.label) if s.key == "cost_usd" else s
            for s in diff_mod.METRIC_SPECS
        ),
    )
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", tokens=(1000, 0, 100), cost=0.5)
    _write_trial(head, "task-a", tokens=(1100, 50, 120), cost=0.8)

    md = render_markdown(
        build_document(
            "run-base",
            "run-head",
            build_report(Job(base).metrics(), Job(head).metrics()),
        )
    )
    assert "cost (USD): mean" in md
    assert "cost (USD): total" not in md


def test_render_markdown_includes_deltas(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8}, tokens=(1000, 0, 100))
    _write_trial(head, "task-a", rewards={"quality": 0.95}, tokens=(1100, 50, 120))

    md = render_markdown(
        build_document(
            "run-base",
            "run-head",
            build_report(Job(base).metrics(), Job(head).metrics()),
        )
    )
    assert "# Skill comparison: `run-base` → `run-head`" in md
    assert "### task-a" in md
    assert "score.quality" in md
    assert "input tokens" in md
    assert "0.95" in md  # head quality value
    assert "+0.150" in md or "+0.15" in md  # quality delta
    assert "+100" in md  # input token delta
    assert "passed trials" in md


def test_render_html_is_visual_and_self_contained(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-improved", rewards={"quality": 0.8}, cost=1.0)
    _write_trial(base, "task-regressed", rewards={"quality": 0.9})
    _write_trial(base, "task-unchanged", rewards={"quality": 0.7})
    _write_trial(base, "task-<unsafe>", rewards={"quality": 0.6})
    _write_trial(head, "task-improved", rewards={"quality": 0.95}, cost=0.5)
    _write_trial(head, "task-regressed", rewards={"quality": 0.6})
    _write_trial(head, "task-unchanged", rewards={"quality": 0.7})
    _write_trial(head, "task-new", rewards={"quality": 0.8})

    html = render_html(
        build_document(
            "run-base",
            "run-head",
            build_report(Job(base).metrics(), Job(head).metrics()),
        )
    )

    assert html.startswith("<!doctype html>")
    assert "<style>" in html
    assert "<script>" not in html
    assert "Which skill performed better?" in html
    assert "Key score signals" in html
    assert "Execution signals" in html
    assert "signals-grid" in html
    assert "Filter tasks" not in html
    assert "Improved" in html
    assert "Regressed" in html
    assert "Only in" in html
    assert '<h3>cost (USD)</h3>' in html
    assert '<span class="delta positive">-0.500</span>' in html
    assert "task-<unsafe>" not in html
    assert "task-improved" in html
    assert ".task-table tbody tr:nth-child(even)" in html


def test_render_html_links_each_git_skill_without_local_file_urls(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8})
    _write_trial(head, "task-a", rewards={"quality": 0.9})

    local_skill = tmp_path / "skills" / "base" / "dr-blacksmith"
    local_skill.mkdir(parents=True)
    base_meta = JobMeta(
        skills=[
            SkillVersion(
                name="dr-blacksmith",
                kind="local",
                path=str(local_skill),
            ),
            SkillVersion(
                name="unrelated",
                kind="git",
                path="/cached/unrelated",
                repo="pagopa/dx",
                ref="base-ref",
                rel_path="plugins/example/skills/unrelated",
            ),
        ]
    )
    head_meta = JobMeta(
        skills=[
            SkillVersion(
                name="dr-blacksmith",
                kind="git",
                path="/cached/dr-blacksmith",
                repo="pagopa/dx",
                ref="foobar",
                rel_path="plugins/aiepdf/skills/dr-blacksmith",
            )
        ]
    )

    html = render_html(
        build_document(
            "run-base",
            "run-head",
            build_report(Job(base).metrics(), Job(head).metrics()),
            base_meta=base_meta,
            head_meta=head_meta,
        )
    )

    assert "file://" not in html
    assert (
        'href="https://github.com/pagopa/dx/tree/foobar/'
        "plugins/aiepdf/skills/dr-blacksmith"
        '"' in html
    )
    assert (
        'href="https://github.com/pagopa/dx/tree/base-ref/'
        "plugins/example/skills/unrelated"
        '"' in html
    )


def _write_artifacts(
    trial: Path,
    *,
    session_db_rows: list[tuple] | None = None,
    jsonl_output_tokens: list[int] | None = None,
    jsonl_nano_aiu: int = 1_665_217_000,
    steps: int | None = None,
) -> None:
    """Write raw trial artifacts that load_job can backfill from."""
    trial.mkdir(parents=True, exist_ok=True)
    if session_db_rows is not None:
        write_session_db(trial / "agent" / "copilot" / "session-store.db", rows=session_db_rows)
    if jsonl_output_tokens is not None:
        write_copilot_jsonl(
            trial / "agent" / "copilot-cli.jsonl",
            output_tokens=jsonl_output_tokens,
            total_nano_aiu=jsonl_nano_aiu,
        )
    if steps is not None:
        traj = trial / "agent" / "trajectory.json"
        traj.parent.mkdir(parents=True, exist_ok=True)
        traj.write_text(
            json.dumps({"final_metrics": {"total_steps": steps}}), encoding="utf-8"
        )


def test_job_metrics_backfills_missing_tokens_from_session_db(tmp_path):
    """GPT runs leave input/cache/cost unset; the session DB fills them."""
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", tokens=(None, None, 4870), cost=None)
    _write_artifacts(
        job / "task-a",
        session_db_rows=[DEFAULT_USAGE_ROW, (35_190, 31_087, 4_100, 359, 290, 207_814_000)],
    )
    m = Job(job).metrics()["task-a"]
    assert m.input_tokens == 55_664
    assert m.cache_tokens == 31_087
    assert m.output_tokens == 4870  # already reported, left untouched
    assert m.cost_usd == 0.00724569
    assert m.n_requests == 2
    assert m.reasoning_tokens == 310


def test_job_metrics_falls_back_to_jsonl_without_session_db(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", tokens=(None, None, None), cost=None)
    _write_artifacts(job / "task-a", jsonl_output_tokens=[41, 196], jsonl_nano_aiu=1_665_217_000)
    m = Job(job).metrics()["task-a"]
    assert m.output_tokens == 237
    assert m.cost_usd == 0.01665217
    assert m.input_tokens is None  # not present in the JSONL stream


def test_job_metrics_reads_steps_from_trajectory(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", tokens=(1000, 200, 300), cost=0.05)
    _write_artifacts(job / "task-a", steps=7)
    m = Job(job).metrics()["task-a"]
    assert m.n_steps == 7


def test_render_markdown_includes_usage_metrics(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", tokens=(None, None, 237), cost=None)
    _write_artifacts(base / "task-a", jsonl_output_tokens=[41, 196], steps=7)
    _write_trial(head, "task-a", tokens=(55664, 31087, 4870), cost=0.00724569)
    _write_artifacts(head / "task-a", steps=9)

    md = render_markdown(
        build_document(
            "run-base",
            "run-head",
            build_report(Job(base).metrics(), Job(head).metrics()),
        )
    )
    assert "reasoning tokens" in md
    assert "model requests" in md
    assert "steps" in md
    assert "0.017" in md  # JSONL-derived cost in the base row ($0.01665217 rounded)
    assert "+2" in md  # steps delta (9 - 7)


VERIFIER_TIMES = ("2026-08-27T10:05:00+00:00", "2026-08-27T10:06:30+00:00")


def test_job_metrics_parses_verifier_duration_and_tokens(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", verifier=VERIFIER_TIMES)
    vdir = job / "task-a" / "verifier"
    vdir.mkdir(parents=True, exist_ok=True)
    # Two judge calls recorded by the test.sh LiteLLM shim (mixed key styles).
    (vdir / "usage.jsonl").write_text(
        json.dumps({"usage": {"input_tokens": 1200, "output_tokens": 80}})
        + "\n"
        + json.dumps({"usage": {"prompt_tokens": 300, "completion_tokens": 20}})
        + "\n"
    )
    m = Job(job).metrics()["task-a"]
    assert m.verifier_duration_sec == 90.0
    assert m.verifier_tokens == 1600  # (1200 + 80) + (300 + 20)


def test_job_metrics_verifier_tokens_from_reward_details(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a")
    vdir = job / "task-a" / "verifier"
    vdir.mkdir(parents=True, exist_ok=True)
    (vdir / "reward-details.json").write_text(
        json.dumps({"reward": {"usage": {"input_tokens": 1000, "output_tokens": 200}}})
    )
    assert Job(job).metrics()["task-a"].verifier_tokens == 1200


def test_job_metrics_verifier_tokens_none_without_usage(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", verifier=VERIFIER_TIMES)
    assert Job(job).metrics()["task-a"].verifier_tokens is None


def _write_meta_trial(
    job_dir: Path,
    task: str,
    *,
    agent_model: str | None,
    agent_effort: str | None,
    skills: list[str],
    judge_model: str | None = None,
    judge_effort: str | None = None,
) -> None:
    trial = job_dir / task
    trial.mkdir(parents=True, exist_ok=True)
    data = {
        "task_name": task,
        "trial_name": f"{task}__abc1234",
        "config": {
            "agent": {
                "model_name": agent_model,
                "kwargs": {"reasoning_effort": agent_effort} if agent_effort else {},
                "skills": skills,
            }
        },
        "agent_info": {"model_info": {"name": agent_model}},
        "verifier_result": {"rewards": {}},
    }
    (trial / "result.json").write_text(json.dumps(data))
    if judge_model:
        vdir = trial / "verifier"
        vdir.mkdir(parents=True, exist_ok=True)
        (vdir / "reward-details.json").write_text(
            json.dumps(
                {
                    "reward": {
                        "judge": {"model": judge_model, "reasoning_effort": judge_effort}
                    }
                }
            )
        )


_GIT_SKILL = (
    "github.com/pagopa/dx/42a33a17977283eb57387f1ae7195a418b93e40f"
    "/plugins/aiepdf/skills"
)


def test_job_meta_models_and_skill_versions(tmp_path, monkeypatch):
    import harbor_bench.jobs as jobs

    home = tmp_path / "home"
    monkeypatch.setattr(jobs, "_GIT_CACHE_PREFIX", home / ".cache" / "harbor" / "skills")
    git_skill = str(home / ".cache" / "harbor" / "skills" / _GIT_SKILL)
    job = _make_job(tmp_path, "run-a")
    _write_meta_trial(
        job,
        "task-a",
        agent_model="gpt-5.6-luna",
        agent_effort="high",
        skills=["/some/local/dr-blacksmith", git_skill],
        judge_model="openai/gpt-5.6-luna",
        judge_effort="medium",
    )
    meta = Job(job).meta()
    assert meta.agent_model == "gpt-5.6-luna"
    assert meta.agent_effort == "high"
    assert meta.judge_model == "openai/gpt-5.6-luna"
    assert meta.judge_effort == "medium"
    local, git = meta.skills
    assert local.kind == "local"
    assert local.name == "dr-blacksmith"
    assert git.kind == "git"
    assert git.repo == "pagopa/dx"
    assert git.ref == "42a33a17977283eb57387f1ae7195a418b93e40f"
    assert git.rel_path == "plugins/aiepdf/skills"
    assert git.version == "(git: pagopa/dx@42a33a17)"


def test_render_markdown_run_config_section(tmp_path, monkeypatch):
    import harbor_bench.jobs as jobs

    home = tmp_path / "home"
    monkeypatch.setattr(jobs, "_GIT_CACHE_PREFIX", home / ".cache" / "harbor" / "skills")
    git_skill = str(home / ".cache" / "harbor" / "skills" / _GIT_SKILL)
    job = _make_job(tmp_path, "run-a")
    _write_meta_trial(
        job,
        "task-a",
        agent_model="gpt-5.6-luna",
        agent_effort="high",
        skills=["/some/local/dr-blacksmith", git_skill],
        judge_model="openai/gpt-5.6-luna",
        judge_effort="medium",
    )
    meta = Job(job).meta()
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a")
    _write_trial(head, "task-a")

    md = render_markdown(
        build_document(
            "run-base",
            "run-head",
            build_report(Job(base).metrics(), Job(head).metrics()),
            base_meta=meta,
            head_meta=meta,
        )
    )
    assert "## Run configuration" in md
    assert "agent model" in md
    assert "gpt-5.6-luna (effort: high)" in md
    assert "openai/gpt-5.6-luna (effort: medium)" in md
    assert "dr-blacksmith (local)" in md
    assert "plugins/aiepdf/skills (git: pagopa/dx@42a33a17)" in md
    assert (
        'git -C "$(git rev-parse --show-toplevel)" diff '
        "42a33a17977283eb57387f1ae7195a418b93e40f -- plugins/aiepdf/skills" in md
    )
    assert "verifier tokens" in md
    assert "verifier duration (s)" in md

def test_render_json_shares_report_numbers(tmp_path):
    """render_json carries the same per-task and summary numbers as the report."""
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8}, tokens=(1000, 0, 100))
    _write_trial(head, "task-a", rewards={"quality": 0.95}, tokens=(1100, 50, 120))

    report = build_report(Job(base).metrics(), Job(head).metrics())
    doc = json.loads(render_json(
        build_document(
            "run-base",
            "run-head",
            report,
        )
    ))

    assert doc["base_job"] == "run-base"
    assert doc["head_job"] == "run-head"
    task = doc["tasks"][0]
    assert task["task"] == "task-a"
    assert task["base"]["score.quality"] == 0.8
    assert task["head"]["score.quality"] == 0.95
    assert task["base"]["input_tokens"] == 1000
    assert task["head"]["input_tokens"] == 1100
    assert task["base"]["passed"] is True
    summary = doc["summary"]
    assert summary["base_tasks"] == 1
    assert summary["head_tasks"] == 1
    by_key = {m["key"]: m for m in summary["metrics"]}
    assert by_key["score.quality"]["base"] == 0.8
    assert by_key["score.quality"]["head"] == 0.95
    assert by_key["input_tokens"]["base"] == 1000
    assert by_key["cost_usd"]["base"] is None
    assert json.loads(json.dumps(doc)) == doc


def test_render_json_one_sided_tasks_are_null(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-base-only", rewards={"quality": 0.8})
    _write_trial(head, "task-head-only", rewards={"quality": 0.5})

    doc = json.loads(render_json(
        build_document(
            "run-base",
            "run-head",
            build_report(Job(base).metrics(), Job(head).metrics()),
        )
    ))
    rows = {t["task"]: t for t in doc["tasks"]}
    assert rows["task-base-only"]["head"] is None
    assert rows["task-head-only"]["base"] is None
    assert doc["summary"]["base_only"] == 1
    assert doc["summary"]["head_only"] == 1


def test_render_json_run_config_present_but_null_without_meta(tmp_path):
    base = _make_job(tmp_path, "run-base")
    _write_trial(base, "task-a")
    doc = json.loads(render_json(
        build_document(
            "run-base",
            "run-base",
            build_report(Job(base).metrics(), Job(base).metrics()),
        )
    ))
    assert doc["run_config"]["agent"]["base"] is None
    assert doc["run_config"]["judge"]["head"] is None
    assert doc["run_config"]["skills"]["base"] == []
    assert doc["run_config"]["skill_diffs"] == []


def test_render_json_run_config_keeps_stable_fields_with_empty_meta(tmp_path):
    base = _make_job(tmp_path, "run-base")
    _write_trial(base, "task-a")
    doc = json.loads(
        render_json(
            build_document(
                "run-base",
                "run-base",
                build_report(Job(base).metrics(), Job(base).metrics()),
                base_meta=JobMeta(),
                head_meta=JobMeta(agent_effort="high"),
            )
        )
    )

    assert doc["run_config"]["agent"]["base"] == {
        "model": None,
        "effort": None,
    }
    assert doc["run_config"]["agent"]["head"] == {
        "model": None,
        "effort": "high",
    }


def test_render_json_run_config_and_skill_diffs(tmp_path, monkeypatch):
    import harbor_bench.jobs as jobs

    home = tmp_path / "home"
    monkeypatch.setattr(jobs, "_GIT_CACHE_PREFIX", home / ".cache" / "harbor" / "skills")
    git_skill = str(home / ".cache" / "harbor" / "skills" / _GIT_SKILL)
    job = _make_job(tmp_path, "run-a")
    _write_meta_trial(
        job,
        "task-a",
        agent_model="gpt-5.6-luna",
        agent_effort="high",
        skills=["/some/local/dr-blacksmith", git_skill],
        judge_model="openai/gpt-5.6-luna",
        judge_effort="medium",
    )
    meta = Job(job).meta()
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a")
    _write_trial(head, "task-a")

    doc = json.loads(render_json(
        build_document(
            "run-base",
            "run-head",
            build_report(Job(base).metrics(), Job(head).metrics()),
            base_meta=meta,
            head_meta=meta,
        )
    ))
    rc = doc["run_config"]
    assert rc["agent"]["base"]["model"] == "gpt-5.6-luna"
    assert rc["agent"]["base"]["effort"] == "high"
    assert rc["judge"]["head"]["model"] == "openai/gpt-5.6-luna"
    assert rc["skills"]["base"][0]["name"] == "dr-blacksmith"
    assert rc["skills"]["base"][0]["kind"] == "local"
    assert rc["skills"]["base"][1]["kind"] == "git"
    assert rc["skills"]["base"][1]["version"] == "(git: pagopa/dx@42a33a17)"
    assert any(
        d["command"].startswith("git -C ")
        and "plugins/aiepdf/skills" in d["command"]
        for d in rc["skill_diffs"]
    )
