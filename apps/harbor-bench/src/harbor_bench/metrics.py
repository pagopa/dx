"""One declaration of each reportable trial metric.

A metric's identity is one :class:`MetricSpec`. The derivation half
(``result_key``, ``metadata_path``, ``legacy_metadata_key``, ``usage_attr``)
names where the value comes from, in precedence order: a ``result.json``
``agent_result`` key, the key path through it where Harbor stores a metric
``AgentContext`` has no field for, the pre-0.26 ``metadata`` alias that only
fills when neither preferred location reports a value, and finally the
aggregated :class:`~harbor_bench.copilot_usage.CopilotUsage` attribute. The
reporting half (``kind``, ``label``, ``integer``) names how the value is
aggregated and displayed.

:data:`METRIC_SPECS` declares the static metrics once. The app-side reader
(``harbor_bench.jobs.Trial.metrics``) reads the derivation half to build a
``TrialMetrics``; ``diff`` and the renderers read the reporting half for the
per-task table and the summary. Verifier reward metrics are the exception:
only a job's actual rewards know their keys, so ``diff`` adds them dynamically
as ``score.<key>`` specs instead of declaring them here.

The registry is the single declaration: ``harbor_bench.jobs`` imports it to
read a trial back and passes its ``TrialMetrics`` field set into
:func:`validate_metric_specs` at import.
"""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass
from typing import Any

from harbor_bench.copilot_usage import CopilotUsage


@dataclass(frozen=True)
class MetricSpec:
    """One reportable metric: its source, label, and summary aggregation.

    ``result_key``, ``metadata_path``, ``legacy_metadata_key`` and
    ``usage_attr`` are the derivation half: the ``result.json``
    ``agent_result`` key, or the key path through it (``metadata_path``), whose
    value wins; the ``agent_result.metadata`` key the pre-0.26 agent wrote
    instead (``legacy_metadata_key``), consulted only when neither preferred
    location reports a value; and the
    :class:`~harbor_bench.copilot_usage.CopilotUsage` attribute that backfills
    when the file cannot report the number. ``kind`` selects how the summary
    aggregates the metric across tasks: ``"score"`` for verifier rewards
    (mean), ``"total"`` for summed metrics (tokens, requests, steps, cost),
    ``"mean"`` for averaged metrics (durations). ``integer`` marks ``"total"``
    metrics whose values are whole counts (tokens, steps, requests), so their
    sum is reported as an int. ``source`` names where the value is read from a
    trial-metrics value object (``harbor_bench.jobs.TrialMetrics`` in the
    bench app): ``"reward"`` for a verifier reward (keyed by ``key``, its
    ``score.<k>`` document name) or ``"field"`` for a direct attribute.
    ``preference`` tells the comparison presentation whether higher, lower,
    or neither direction is favorable. ``headline_group`` opts a metric into
    the compact HTML signal cards. ``completed`` (and the verifier gate
    derived from a primary score) is a trial-level flag and is reported
    separately, not as a metric.
    """

    key: str
    kind: str = "mean"
    label: str | None = None
    integer: bool = False
    source: str = "field"  # "field" | "reward"
    result_key: str | None = None
    metadata_path: tuple[str, ...] | None = None
    legacy_metadata_key: str | None = None
    usage_attr: str | None = None
    preference: str = "higher"  # "higher" | "lower" | "neutral"
    headline_group: str | None = None

    def read(self, metrics: Any) -> Any:
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
#: ``diff.metric_specs``); this registry declares the rest. ``cost_usd``
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
        preference="lower",
    ),
    MetricSpec(
        "cache_tokens",
        "total",
        "cache tokens",
        integer=True,
        result_key="n_cache_tokens",
        usage_attr="cache_read_tokens",
        preference="neutral",
    ),
    MetricSpec(
        "output_tokens",
        "total",
        "output tokens",
        integer=True,
        result_key="n_output_tokens",
        usage_attr="output_tokens",
        preference="lower",
    ),
    MetricSpec(
        "reasoning_tokens",
        "total",
        "reasoning tokens",
        integer=True,
        metadata_path=("metadata", "copilot_usage", "reasoning_tokens"),
        legacy_metadata_key="n_reasoning_tokens",
        usage_attr="reasoning_tokens",
        preference="lower",
    ),
    MetricSpec(
        # Harbor persists no request count: its usage metadata carries
        # ``premium_requests`` (a premium-request *cost*, not ``requests.count``)
        # and ``AgentContext`` has no request field, so the usage artifact is
        # the only current source. Trials from before Harbor 0.26 recorded the
        # count themselves under ``metadata["n_requests"]``.
        "n_requests",
        "total",
        "model requests",
        integer=True,
        legacy_metadata_key="n_requests",
        usage_attr="n_requests",
        preference="lower",
    ),
    MetricSpec(
        "n_steps",
        "total",
        "steps",
        integer=True,
        preference="lower",
        headline_group="Execution signals",
    ),
    MetricSpec(
        "cost_usd",
        "total",
        "cost (USD)",
        result_key="cost_usd",
        usage_attr="cost_usd",
        preference="lower",
        headline_group="Execution signals",
    ),
    MetricSpec(
        "verifier_tokens",
        "total",
        "verifier tokens",
        integer=True,
        preference="neutral",
    ),
    MetricSpec(
        "agent_duration_sec",
        "mean",
        "agent duration (s)",
        preference="lower",
    ),
    MetricSpec(
        "total_duration_sec",
        "mean",
        "total duration (s)",
        preference="lower",
        headline_group="Execution signals",
    ),
    MetricSpec(
        "verifier_duration_sec",
        "mean",
        "verifier duration (s)",
        preference="neutral",
    ),
)


def derivable_specs() -> tuple[MetricSpec, ...]:
    """The registry specs with a derivation (``usage_attr`` set), in order.

    These are the metrics the bench reader (``harbor_bench.jobs.Trial``)
    derives from the trial's artifacts: a ``result.json`` value wins, the
    pre-0.26 metadata alias (``legacy_metadata_key``) fills next, and the
    aggregated usage attribute fills last, when the file cannot report the
    number.
    """
    return tuple(spec for spec in METRIC_SPECS if spec.usage_attr is not None)


def validate_metric_specs(
    *,
    trial_metric_fields: set[str] | None = None,
) -> None:
    """Raise when a registry key or usage attribute names no real field.

    The registry is the single declaration of each metric's identity; the
    reader's ``TrialMetrics`` (in ``harbor_bench.jobs``) and
    :class:`~harbor_bench.copilot_usage.CopilotUsage` re-express those names as
    dataclass fields. The reader passes the field set it knows, so a renamed
    field or a new metric fails at import instead of surfacing as a
    ``TypeError`` or a silent ``None`` on a live trial. Dynamic ``score.<key>``
    specs (``source="reward"``) are added by ``diff`` from a job's actual
    reward keys and are never checked against a dataclass.

    It also holds each derivation declaration to one shape: a spec names one
    preferred persisted location (``result_key`` or ``metadata_path``), and a
    ``legacy_metadata_key`` names a distinct fallback for a spec the reader
    actually derives (``usage_attr`` set).
    """
    usage_fields = {field.name for field in dataclasses.fields(CopilotUsage)}
    for spec in METRIC_SPECS:
        if spec.preference not in {"higher", "lower", "neutral"}:
            raise TypeError(
                f"metric spec {spec.key!r} has unsupported preference "
                f"{spec.preference!r}"
            )
        if spec.source == "reward":
            continue
        if trial_metric_fields is not None and spec.key not in trial_metric_fields:
            raise TypeError(
                f"metric spec key {spec.key!r} has no TrialMetrics field "
                "(add the field to jobs.TrialMetrics)"
            )
        if spec.result_key is not None and spec.metadata_path is not None:
            raise TypeError(
                f"metric spec {spec.key!r} declares both result_key and "
                "metadata_path; name the one persisted location"
            )
        if spec.metadata_path is not None and not (
            isinstance(spec.metadata_path, tuple)
            and spec.metadata_path
            and all(isinstance(part, str) and part for part in spec.metadata_path)
        ):
            raise TypeError(
                f"metric spec {spec.key!r} metadata_path must be a non-empty "
                "tuple of non-empty strings"
            )
        if spec.legacy_metadata_key is not None:
            if not (
                isinstance(spec.legacy_metadata_key, str) and spec.legacy_metadata_key
            ):
                raise TypeError(
                    f"metric spec {spec.key!r} legacy_metadata_key must be a "
                    "non-empty string"
                )
            if spec.usage_attr is None:
                raise TypeError(
                    f"metric spec {spec.key!r} declares legacy_metadata_key "
                    "but no usage_attr, so the reader never consults it"
                )
            if spec.metadata_path == ("metadata", spec.legacy_metadata_key):
                raise TypeError(
                    f"metric spec {spec.key!r} legacy_metadata_key repeats its "
                    "metadata_path; name the fallback location"
                )
        if spec.usage_attr is not None and spec.usage_attr not in usage_fields:
            raise TypeError(
                f"metric spec {spec.key!r} names usage attribute "
                f"{spec.usage_attr!r}, which is not a CopilotUsage field"
            )
