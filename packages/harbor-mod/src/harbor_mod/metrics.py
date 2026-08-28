"""One declaration of each reportable trial metric.

A metric's identity is one :class:`MetricSpec`. The derivation half
(``result_key``, ``usage_attr``) names where the value comes from: a
``result.json`` ``agent_result`` key whose value wins, and the aggregated
:class:`~harbor_mod.copilot_usage.CopilotUsage` attribute that backfills when
the file cannot report the number. The reporting half (``kind``, ``label``,
``integer``) names how the value is aggregated and displayed.

:data:`METRIC_SPECS` declares the static metrics once. ``Trial.metrics`` reads
the derivation half to build a :class:`~harbor_mod.jobs.TrialMetrics`;
``compare`` and the renderers read the reporting half for the per-task table
and the summary. Verifier reward metrics are the exception: only a job's
actual rewards know their keys, so ``compare`` adds them dynamically as
``score.<key>`` specs instead of declaring them here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from harbor_mod.jobs import TrialMetrics


@dataclass(frozen=True)
class MetricSpec:
    """One reportable metric: its source, label, and summary aggregation.

    ``result_key`` and ``usage_attr`` are the derivation half: the
    ``result.json`` ``agent_result`` key whose value wins, and the
    :class:`~harbor_mod.copilot_usage.CopilotUsage` attribute that backfills
    when the file cannot report the number. ``kind`` selects how the summary
    aggregates the metric across tasks: ``"score"`` for verifier rewards
    (mean), ``"total"`` for summed metrics (tokens, requests, steps, cost),
    ``"mean"`` for averaged metrics (durations). ``integer`` marks ``"total"``
    metrics whose values are whole counts (tokens, steps, requests), so their
    sum is reported as an int. ``source`` names where the value is read from a
    :class:`~harbor_mod.jobs.TrialMetrics`: ``"reward"`` for a verifier reward
    (keyed by ``key``, its ``score.<k>`` document name) or ``"field"`` for a
    direct attribute. ``passed`` is a trial-level flag and is reported
    separately, not as a metric.
    """

    key: str
    kind: str = "mean"
    label: str | None = None
    integer: bool = False
    source: str = "field"  # "field" | "reward"
    result_key: str | None = None
    usage_attr: str | None = None

    def read(self, metrics: TrialMetrics) -> Any:
        """The value of this metric for one trial, or ``None`` when absent."""
        if self.source == "reward":
            return metrics.rewards.get(self.key.removeprefix("score."))
        return getattr(metrics, self.key)

    @property
    def display_label(self) -> str:
        return self.label or self.key

    @property
    def summary_word(self) -> str:
        """Summary aggregation word: ``"mean"`` for score/mean, ``"total"`` for totals."""
        return "total" if self.kind == "total" else "mean"

    def aggregate(self, values: list[Any]) -> int | float | None:
        """Aggregate one metric's per-task values for the summary line.

        ``"total"`` metrics are summed (as an int when ``integer``); ``"score"``
        and ``"mean"`` metrics are averaged. Returns ``None`` when no task
        reported a value for the metric.
        """
        if not values:
            return None
        if self.kind == "total":
            total = sum(values)
            return int(total) if self.integer else total
        return sum(values) / len(values)


#: Trial metrics reported per task, in display order. One entry is the whole
#: contract for a metric: the report field and document key (``key``), the
#: summary aggregation (``kind``/``integer``/``label``) and — for the
#: usage-backed metrics — the derivation (``result_key`` + ``usage_attr``)
#: that ``Trial.metrics`` reads to backfill missing values. Verifier reward
#: metrics are added dynamically from each job's reward keys (see
#: ``compare.metric_specs``); this registry declares the rest. ``cost_usd``
#: and the durations are floats; token counts and step/request counts are
#: ints.
METRIC_SPECS: tuple[MetricSpec, ...] = (
    MetricSpec(
        "input_tokens",
        "total",
        "input tokens",
        integer=True,
        result_key="n_input_tokens",
        usage_attr="input_tokens",
    ),
    MetricSpec(
        "cache_tokens",
        "total",
        "cache tokens",
        integer=True,
        result_key="n_cache_tokens",
        usage_attr="cache_read_tokens",
    ),
    MetricSpec(
        "output_tokens",
        "total",
        "output tokens",
        integer=True,
        result_key="n_output_tokens",
        usage_attr="output_tokens",
    ),
    MetricSpec(
        "reasoning_tokens",
        "total",
        "reasoning tokens",
        integer=True,
        result_key="n_reasoning_tokens",
        usage_attr="reasoning_tokens",
    ),
    MetricSpec(
        "n_requests",
        "total",
        "model requests",
        integer=True,
        result_key="n_requests",
        usage_attr="n_requests",
    ),
    MetricSpec("n_steps", "total", "steps", integer=True),
    MetricSpec(
        "cost_usd",
        "total",
        "cost (USD)",
        result_key="cost_usd",
        usage_attr="cost_usd",
    ),
    MetricSpec("verifier_tokens", "total", "verifier tokens", integer=True),
    MetricSpec("agent_duration_sec", "mean", "agent duration (s)"),
    MetricSpec("total_duration_sec", "mean", "total duration (s)"),
    MetricSpec("verifier_duration_sec", "mean", "verifier duration (s)"),
)


def derivable_specs() -> tuple[MetricSpec, ...]:
    """The registry specs with a derivation (``result_key`` set), in order.

    These are the metrics :meth:`harbor_mod.jobs.Trial.metrics` backfills from
    the trial's artifacts: a ``result.json`` value wins, the aggregated usage
    attribute fills when the file cannot report the number.
    """
    return tuple(spec for spec in METRIC_SPECS if spec.result_key is not None)
