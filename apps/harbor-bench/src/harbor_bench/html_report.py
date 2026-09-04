"""Render the visual Harbor comparison adapter."""

from __future__ import annotations

from dataclasses import asdict
from functools import lru_cache
from typing import Any

from harbor_bench.comparison_presentation import (
    MetricPresentation,
    OutcomePresentation,
    build_presentation,
)
from harbor_bench.diff import ReportDocument


@lru_cache(maxsize=1)
def _template() -> Any:
    """Load Jinja only when the HTML adapter is requested."""
    from jinja2 import Environment, PackageLoader, StrictUndefined

    return Environment(
        loader=PackageLoader("harbor_bench", "templates"),
        autoescape=True,
        undefined=StrictUndefined,
    ).get_template("comparison.html.j2")


def _bar_width(value: Any, other: Any, key: str) -> str:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return "0.0"
    other_number = (
        float(other)
        if not isinstance(other, bool) and isinstance(other, (int, float))
        else 0.0
    )
    number = float(value)
    if key.startswith("score.") and 0 <= number <= 1:
        width = number * 100
    else:
        width = abs(number) / max(abs(number), abs(other_number), 1.0) * 100
    return f"{max(0.0, min(100.0, width)):.1f}"


def _metric_context(metric: MetricPresentation, group: str) -> dict[str, Any]:
    return {
        **asdict(metric),
        "group": group,
        "base_width": _bar_width(
            metric.base_value,
            metric.head_value,
            metric.key,
        ),
        "head_width": _bar_width(
            metric.head_value,
            metric.base_value,
            metric.key,
        ),
    }


def _outcome_context(
    outcome: OutcomePresentation,
    total: int,
) -> dict[str, Any]:
    return {
        **asdict(outcome),
        "width": f"{outcome.count / total * 100:.1f}" if total else "0.0",
    }


def render_html(document: ReportDocument) -> str:
    """Render a self-contained visual report from the packaged template."""
    presentation = build_presentation(document)
    context = asdict(presentation)
    context["score"] = _metric_context(presentation.score, "")
    context["score_cards"] = [
        _metric_context(metric, "Key score signals")
        for metric in presentation.comparison_metrics
        if metric.key.startswith("score.")
        and (metric.base_value is not None or metric.head_value is not None)
    ]
    context["signal_cards"] = [
        _metric_context(metric, metric.headline_group)
        for metric in presentation.comparison_metrics
        if metric.headline_group is not None
        and (metric.base_value is not None or metric.head_value is not None)
    ]
    total_outcomes = sum(outcome.count for outcome in presentation.outcomes)
    context["outcome_segments"] = [
        _outcome_context(outcome, total_outcomes)
        for outcome in presentation.outcomes
    ]
    context["outcome_legend"] = [
        asdict(outcome) for outcome in presentation.outcomes
    ]
    return _template().render(**context)
