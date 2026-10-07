"""Render the visual Harbor comparison adapter."""

from __future__ import annotations

from dataclasses import asdict
from functools import lru_cache
from typing import Any

from harbor_bench.comparison_presentation import (
    ComparisonPresentation,
    MetricPresentation,
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


def _count_delta(base: int, head: int) -> str:
    return f"{head - base:+,}"


def _count_direction(base: int, head: int) -> str:
    if head == base:
        return "neutral"
    return "positive" if head > base else "negative"


def _percentage_delta(base: float | None, head: float | None) -> str:
    if base is None or head is None:
        return "—"
    return f"{(head - base) * 100:+.0f}%"


def _kpi_card(
    group: str,
    label: str,
    base: str,
    head: str,
    *,
    delta: str,
    direction: str,
    note: str | None = None,
) -> dict[str, Any]:
    return {
        "group": group,
        "label": label,
        "base": base,
        "head": head,
        "delta": delta,
        "direction": direction,
        "note": note,
    }


def _kpi_cards(presentation: ComparisonPresentation) -> list[dict[str, Any]]:
    """The gate and completion cards appended to the key-signal grid.

    Every card names both sides explicitly: the template renders each card
    with the same Base → Head value layout as the metric cards, so which side
    a number belongs to is never implicit. The primary score is not repeated
    here; it already appears as a key score signal card.
    """
    comparable = presentation.comparable
    evaluated = comparable.evaluated_tasks
    same_criteria = (
        comparable.base_criteria_total == comparable.head_criteria_total > 0
    )
    if not comparable.base_criteria_total and not comparable.head_criteria_total:
        criteria_card = _kpi_card(
            "Verifier gate",
            "Criteria passed",
            "—",
            "—",
            delta="—",
            direction="neutral",
            note="not recorded by the verifier",
        )
    else:
        criteria_card = _kpi_card(
            "Verifier gate",
            "Criteria passed",
            comparable.base_criteria,
            comparable.head_criteria,
            delta=_count_delta(
                comparable.base_criteria_passed,
                comparable.head_criteria_passed,
            )
            if same_criteria
            else "—",
            direction=_count_direction(
                comparable.base_criteria_passed,
                comparable.head_criteria_passed,
            )
            if same_criteria
            else "neutral",
            note="from verifier reward details"
            if same_criteria
            else "different criterion sets",
        )
    return [
        _kpi_card(
            "Verifier gate",
            "Tasks passed",
            f"{comparable.base_gate_passed} / {evaluated}",
            f"{comparable.head_gate_passed} / {evaluated}",
            delta=_percentage_delta(
                comparable.base_rate_value,
                comparable.head_rate_value,
            ),
            direction=comparable.pass_rate_direction,
            note="verifier reward met its gate",
        ),
        criteria_card,
        _kpi_card(
            "Execution",
            "Completed",
            f"{comparable.base_completed} / {evaluated}",
            f"{comparable.head_completed} / {evaluated}",
            delta=_count_delta(
                comparable.base_completed,
                comparable.head_completed,
            ),
            direction="neutral",
            note="finished without an exception",
        ),
    ]


def render_html(document: ReportDocument) -> str:
    """Render a self-contained visual report from the packaged template."""
    presentation = build_presentation(document)
    context = asdict(presentation)
    context["kpi_cards"] = _kpi_cards(presentation)
    context["signal_cards"] = [
        _metric_context(metric, metric.headline_group)
        for metric in presentation.comparison_metrics
        if metric.headline_group is not None
        and (metric.base_value is not None or metric.head_value is not None)
    ]
    return _template().render(**context)
