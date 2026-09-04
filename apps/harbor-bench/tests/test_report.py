"""Tests for the comparison presentation and rendering interfaces."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from harbor_bench.comparison_presentation import build_presentation
from harbor_bench.diff import build_document, build_report
from harbor_bench.jobs import JobMeta, SkillVersion, TrialMetrics
from harbor_bench.report import render_report


def _metrics(
    task: str,
    quality: float,
    *,
    passed: bool = True,
    cost: float | None = None,
) -> TrialMetrics:
    return TrialMetrics(
        task_name=task,
        rewards={"quality": quality},
        cost_usd=cost,
        passed=passed,
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
                "base-only": _metrics("base-only", 0.0, passed=False),
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
                    passed=False,
                ),
                "base-only": _metrics("base-only", 0.1),
            },
            {
                "common": TrialMetrics(
                    task_name="common",
                    rewards={},
                    passed=True,
                )
            },
        )
    )

    assert presentation.score.key == "success_rate"
    assert presentation.score.base == "0%"
    assert presentation.score.head == "100%"
    assert presentation.verdict == "Head performs better"


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
                "base-only": _metrics("base-only", 0.0, passed=False),
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
