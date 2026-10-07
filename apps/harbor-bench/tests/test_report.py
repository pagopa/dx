"""Tests for the comparison presentation and rendering interfaces."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from harbor_bench.comparison_presentation import build_presentation
from harbor_bench.diff import build_document, build_report
from harbor_bench.jobs import (
    CriterionResult,
    JobMeta,
    ScoringGate,
    SkillVersion,
    TrialMetrics,
)
from harbor_bench.report import render_report


def _metrics(
    task: str,
    quality: float,
    *,
    completed: bool = True,
    cost: float | None = None,
) -> TrialMetrics:
    return TrialMetrics(
        task_name=task,
        rewards={"quality": quality},
        cost_usd=cost,
        completed=completed,
    )


def _gated_metrics(
    task: str,
    reward: float,
    criteria: dict[str, bool],
    *,
    completed: bool = True,
    threshold: float | None = 0.8,
) -> TrialMetrics:
    """Metrics with RewardKit criterion outcomes and a recorded gate."""
    return TrialMetrics(
        task_name=task,
        rewards={"reward": reward},
        completed=completed,
        criteria=tuple(
            CriterionResult(
                name=name,
                description=f"{name} criterion",
                value=1.0 if outcome else 0.0,
            )
            for name, outcome in criteria.items()
        ),
        scoring=ScoringGate(aggregation="threshold", threshold=threshold),
    )


def _document(
    base: dict[str, TrialMetrics],
    head: dict[str, TrialMetrics],
    *,
    base_meta: JobMeta | None = None,
    head_meta: JobMeta | None = None,
):
    return build_document(
        "run-base",
        "run-head",
        build_report(base, head),
        base_meta=base_meta,
        head_meta=head_meta,
    )


def test_one_sided_tasks_do_not_change_comparable_verdict():
    presentation = build_presentation(
        _document(
            {
                "common": _metrics("common", 1.0),
                "base-only": _metrics("base-only", 0.0, completed=False),
            },
            {"common": _metrics("common", 1.0)},
        )
    )

    assert presentation.verdict == "No clear change"
    assert presentation.score.base_value == 1.0
    assert presentation.score.head_value == 1.0
    assert presentation.comparable.tasks == 1
    assert presentation.comparable.base_rate_value == 1.0
    assert presentation.comparable.head_rate_value == 1.0
    assert presentation.population.base_tasks == 2
    assert presentation.population.head_tasks == 1


def test_comparison_metrics_use_only_paired_values():
    presentation = build_presentation(
        _document(
            {
                "common": _metrics("common", 0.8, cost=1.0),
                "base-only": _metrics("base-only", 0.1, cost=50.0),
            },
            {"common": _metrics("common", 0.9, cost=0.5)},
        )
    )
    cost = next(
        metric
        for metric in presentation.comparison_metrics
        if metric.key == "cost_usd"
    )

    assert cost.base_value == 1.0
    assert cost.head_value == 0.5
    assert cost.direction == "positive"


def test_headline_falls_back_to_success_rate_without_paired_scores():
    presentation = build_presentation(
        _document(
            {
                "common": TrialMetrics(
                    task_name="common",
                    rewards={},
                    completed=False,
                ),
                "base-only": _metrics("base-only", 0.1),
            },
            {
                "common": TrialMetrics(
                    task_name="common",
                    rewards={},
                    completed=True,
                )
            },
        )
    )

    assert presentation.score.key == "success_rate"
    assert presentation.score.base == "0%"
    assert presentation.score.head == "100%"
    assert presentation.verdict == "Head performs better"


def test_criteria_changes_surface_when_gate_scores_tie():
    """A local regression inside a tied, failing score must not read as "Unchanged"."""
    presentation = build_presentation(
        _document(
            {
                "dr-blacksmith-5": _gated_metrics(
                    "dr-blacksmith-5",
                    0.0,
                    {"language": False, "catalog": False, "no-fabrication": True},
                )
            },
            {
                "dr-blacksmith-5": _gated_metrics(
                    "dr-blacksmith-5",
                    0.0,
                    {"language": True, "catalog": False, "no-fabrication": False},
                )
            },
        )
    )
    task = presentation.tasks[0]

    assert presentation.verdict == "Both runs failed — criteria changed"
    assert task.outcome == "mixed"
    assert task.criteria_changed == 2
    assert task.head_gained == ("language criterion",)
    assert task.base_gained == ("no-fabrication criterion",)
    assert task.gate_note == "Base and Head below the 0.8 gate"
    assert presentation.comparable.base_gate_passed == 0
    assert presentation.comparable.head_gate_passed == 0
    assert presentation.comparable.base_completed == 1
    assert presentation.comparable.head_completed == 1
    criteria_card = next(
        card for card in presentation.signals if card.label == "Criteria passed"
    )
    assert criteria_card.base == "1 / 3"
    assert criteria_card.head == "1 / 3"
    assert criteria_card.delta == "+0"


def test_both_failing_runs_are_not_unchanged():
    presentation = build_presentation(
        _document(
            {"t": TrialMetrics(task_name="t", rewards={"reward": 0.0})},
            {"t": TrialMetrics(task_name="t", rewards={"reward": 0.0})},
        )
    )

    assert presentation.verdict == "Both runs failed every comparable task"
    assert presentation.tasks[0].outcome == "failed"
    assert presentation.comparable.base_gate_passed == 0
    assert presentation.comparable.head_gate_passed == 0
    tasks_passed = next(
        card for card in presentation.signals if card.label == "Tasks passed"
    )
    assert tasks_passed.base == "0 / 1"


def test_gate_flip_beats_completion_status():
    """Two completed trials still regress/improve when the gate flips."""
    presentation = build_presentation(
        _document(
            {"t": TrialMetrics(task_name="t", rewards={"reward": 0.0}, completed=True)},
            {"t": TrialMetrics(task_name="t", rewards={"reward": 1.0}, completed=True)},
        )
    )

    assert presentation.tasks[0].outcome == "improved"
    assert presentation.verdict == "Head performs better"
    assert presentation.comparable.base_gate_passed == 0
    assert presentation.comparable.head_gate_passed == 1
    assert presentation.comparable.base_completed == 1
    assert presentation.comparable.head_completed == 1


def test_signal_cards_are_formatted_once_for_every_adapter():
    """The three key-signal cards are presentation values, not adapter logic."""
    presentation = build_presentation(
        _document(
            {
                "t": _gated_metrics("t", 0.0, {"language": True}),
                "u": _gated_metrics("u", 0.0, {"language": True}),
            },
            {
                "t": _gated_metrics("t", 1.0, {"language": True}),
                "u": _gated_metrics("u", 1.0, {"language": True}),
            },
        )
    )
    cards = {card.label: card for card in presentation.signals}

    assert [card.label for card in presentation.signals] == [
        "Tasks passed",
        "Criteria passed",
        "Completed",
    ]
    passed = cards["Tasks passed"]
    assert passed.group == "Verifier gate"
    assert (passed.base, passed.head) == ("0 / 2", "2 / 2")
    assert passed.delta == "+100%"
    assert passed.direction == "positive"
    assert passed.note == "verifier reward met its gate"
    criteria = cards["Criteria passed"]
    assert (criteria.base, criteria.head, criteria.delta) == ("2 / 2", "2 / 2", "+0")
    assert criteria.note == "from verifier reward details"
    completed = cards["Completed"]
    assert completed.group == "Execution"
    assert completed.direction == "neutral"
    assert completed.note == "finished without an exception"


def test_criteria_card_suppresses_delta_when_criterion_sets_differ():
    """Equal totals with different criterion names must not produce a delta."""
    presentation = build_presentation(
        _document(
            {"t": _gated_metrics("t", 0.0, {"language": False, "catalog": True})},
            {"t": _gated_metrics("t", 0.0, {"language": True, "format": True})},
        )
    )
    criteria = next(
        card for card in presentation.signals if card.label == "Criteria passed"
    )

    assert criteria.base == "1 / 2"
    assert criteria.head == "2 / 2"
    assert criteria.delta == "—"
    assert criteria.direction == "neutral"
    assert criteria.note == "different criterion sets"


def test_render_report_json_exposes_criteria_and_gate():
    value = json.loads(
        render_report(
            _document(
                {
                    "dr-blacksmith-5": _gated_metrics(
                        "dr-blacksmith-5",
                        0.0,
                        {"language": False, "catalog": False, "no-fabrication": True},
                    )
                },
                {
                    "dr-blacksmith-5": _gated_metrics(
                        "dr-blacksmith-5",
                        0.0,
                        {"language": True, "catalog": False, "no-fabrication": False},
                    )
                },
            ),
            "json",
        )
    )

    comparison = value["comparison"]
    assert comparison["base_gate_passed"] == 0
    assert comparison["base_completed"] == 1
    assert comparison["base_criteria_passed"] == 1
    assert comparison["base_criteria_total"] == 3
    assert [card["label"] for card in comparison["signals"]] == [
        "Tasks passed",
        "Criteria passed",
        "Completed",
    ]
    assert comparison["signals"][1]["note"] == "from verifier reward details"
    task = value["tasks"][0]
    assert task["outcome"] == "mixed"
    assert task["criteria_changed"] == 2
    assert task["threshold"] == 0.8
    assert task["base"]["completed"] is True
    assert task["base"]["eval_passed"] is False
    assert "passed" not in task["base"]
    directions = {c["name"]: c["direction"] for c in task["criteria"]}
    assert directions == {
        "language": "positive",
        "catalog": "neutral",
        "no-fabrication": "negative",
    }


def test_render_html_shows_criteria_table_and_gate_note():
    html = render_report(
        _document(
            {
                "dr-blacksmith-5": _gated_metrics(
                    "dr-blacksmith-5",
                    0.0,
                    {"language": False, "catalog": False},
                )
            },
            {
                "dr-blacksmith-5": _gated_metrics(
                    "dr-blacksmith-5",
                    0.0,
                    {"language": True, "catalog": False},
                )
            },
        ),
        "html",
    )

    assert "Tasks passed" in html
    assert "Criteria passed" in html
    assert "Both runs failed — criteria changed" in html
    assert "Verifier criteria" in html
    assert "Head gained" in html
    assert "criteria changed" in html
    assert "below the 0.8 gate" in html


def test_render_html_merges_cards_into_key_signals():
    """One Key signals grid: gate + execution cards, score rows in the table."""
    html = render_report(
        _document(
            {"t": _gated_metrics("t", 0.0, {"language": False})},
            {"t": _gated_metrics("t", 1.0, {"language": True})},
        ),
        "html",
    )
    start = html.find("Key signals")
    grid = html[start : html.find("</section>", start)]

    assert "What changed between Base and Head?" not in html
    assert "kpi-grid" not in html
    assert "signals-grid" not in html
    assert "Key score signals" not in html
    assert "score.reward" not in grid  # score rows stay in the task table
    assert "score.reward" in html
    assert grid.count('class="metric-values kpi-values"') == 3
    assert "Tasks passed" in grid
    assert "Criteria passed" in grid
    assert "Completed" in grid
    assert "Verifier gate" in grid
    assert "Execution" in grid
    assert "kpi-note" in grid
    assert "Primary metric" not in html
    assert '<details class="task-card" open>' in html


def test_each_skill_keeps_its_own_source_link(tmp_path: Path):
    local_skill = tmp_path / "skills" / "target"
    local_skill.mkdir(parents=True)
    meta = JobMeta(
        skills=[
            SkillVersion("target", "local", str(local_skill)),
            SkillVersion(
                "unrelated",
                "git",
                "/cache/unrelated",
                repo="pagopa/dx",
                ref="abc123",
                rel_path="plugins/example/skills/unrelated",
            ),
        ]
    )

    presentation = build_presentation(
        _document(
            {"common": _metrics("common", 0.8)},
            {"common": _metrics("common", 0.9)},
            base_meta=meta,
        )
    )
    target, unrelated = presentation.run_cards[0].skills

    assert target.source_url is None
    assert unrelated.source_url == (
        "https://github.com/pagopa/dx/tree/abc123/"
        "plugins/example/skills/unrelated"
    )


@pytest.mark.parametrize("output_format", ["markdown", "html", "json"])
def test_render_report_returns_text_for_every_format(output_format):
    output = render_report(
        _document(
            {"common": _metrics("common", 0.8)},
            {"common": _metrics("common", 0.9)},
        ),
        output_format,
    )

    assert isinstance(output, str)
    assert output


def test_render_report_json_exposes_comparable_result():
    output = render_report(
        _document(
            {
                "common": _metrics("common", 0.8),
                "base-only": _metrics("base-only", 0.0, completed=False),
            },
            {"common": _metrics("common", 0.9)},
        ),
        "json",
    )
    value = json.loads(output)

    assert value["comparison"]["verdict"] == "Head performs better"
    assert value["comparison"]["comparable_tasks"] == 1
    assert value["comparison"]["primary_metric"]["population"] == "comparable_tasks"
    assert value["summary"]["base_tasks"] == 2
    assert value["summary"]["metrics"][0]["population"] == "whole_job"


def test_presentation_formats_values_through_its_interface():
    presentation = build_presentation(
        _document(
            {
                "common": TrialMetrics(
                    task_name="common",
                    rewards={"quality": 0.8},
                    input_tokens=1000,
                ),
                "base-only": _metrics("base-only", 0.5),
            },
            {
                "common": TrialMetrics(
                    task_name="common",
                    rewards={"quality": 0.95},
                    input_tokens=1200,
                ),
            },
        )
    )
    common = next(task for task in presentation.tasks if task.name == "common")
    input_tokens = next(
        metric for metric in common.metrics if metric.key == "input_tokens"
    )
    base_only = next(
        task for task in presentation.tasks if task.name == "base-only"
    )

    assert presentation.score.delta == "+0.150"
    assert input_tokens.base == "1,000"
    assert input_tokens.delta == "+200"
    assert base_only.metrics[0].delta == "(only base) 0.500"


def test_render_report_rejects_unknown_format():
    with pytest.raises(ValueError, match="unsupported report format"):
        render_report(_document({}, {}), "yaml")


def test_importing_report_does_not_load_jinja():
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import sys; import harbor_bench.report; "
                "assert 'jinja2' not in sys.modules"
            ),
        ],
        check=False,
        capture_output=True,
        text=True,
    )

    assert result.returncode == 0, result.stderr
