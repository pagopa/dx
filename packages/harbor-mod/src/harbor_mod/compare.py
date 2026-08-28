"""Compare two Harbor job directories and emit a delta report.

Each ``harbor run -c config.yaml`` writes its trials under ``<jobs_dir>/<run>``
(default ``jobs/<timestamp>``): one subdirectory per trial with a
``result.json``. Jobs and trials are read through :mod:`harbor_mod.jobs`,
which owns the trial-directory layout and the ``result.json`` schema
(:meth:`~harbor_mod.jobs.Trial.metrics` and
:meth:`~harbor_mod.jobs.Trial.meta`). This module joins two such jobs and
reports, per task, the delta of the metrics the run produced:

- score: the verifier rewards (e.g. RewardKit criteria in ``verifier_result``)
- tokens: agent input/cache/output tokens
- cost: agent execution cost in USD
- duration: agent execution, total trial and verifier wall-clock
- steps: agent trajectory steps and model request count
- pass/fail: whether the trial completed without an exception

Token/cost values that ``result.json`` cannot report (GPT runs leave input/cache
tokens and cost unset) are backfilled from the trial's raw artifacts when they
are available: ``agent/copilot/session-store.db`` (authoritative per-request
usage) with a fallback to ``agent/copilot-cli.jsonl``. Step counts come from
``agent/trajectory.json``.

Besides the per-task deltas, a **run configuration** section reports the agent
and judge (grading) models with their reasoning effort, the version of each
injected skill (local workspace vs. git ref), and a ready-to-run ``git diff``
command comparing a git-loaded skill against the local checkout. Verifier
tokens come from ``verifier/reward-details.json`` → ``reward.usage`` (persisted
by agent-mode judges; LLM judges in harbor-rewardkit 0.2.0 do not record it).

This module is the data side of the comparison: reading, joining, and
aggregating. The Markdown and JSON rendering of that data lives in
:mod:`harbor_mod.report`, which consumes the typed values here and owns the
number/delta formatting and the run-configuration cells.

Use it to compare the same eval set run against two versions of a skill (e.g.
the current workspace vs. a git ref loaded with ``harbor run --skill``).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from harbor_mod.jobs import Job, JobMeta, TrialMetrics


@dataclass(frozen=True)
class MetricSpec:
    """One reportable metric: its key, display label, and summary aggregation.

    ``kind`` selects how the summary aggregates the metric across tasks:
    ``"score"`` for verifier rewards (mean), ``"total"`` for summed metrics
    (tokens, requests, steps, cost), ``"mean"`` for averaged metrics
    (durations). ``integer`` marks ``"total"`` metrics whose values are whole
    counts (tokens, steps, requests), so their sum is reported as an int.
    ``source`` names where the value is read from a :class:`TrialMetrics`:
    ``"reward"`` for a verifier reward (keyed by ``key``, its ``score.<k>``
    document name) or ``"field"`` for a direct attribute. The :data:`_METRICS`
    registry below is the single place a new metric is declared: the per-task
    table, the column label, the summary line, and the value read all follow
    from one entry. ``passed`` is a trial-level flag and is reported
    separately, not as a metric.
    """

    key: str
    kind: str = "mean"
    label: str | None = None
    integer: bool = False
    source: str = "field"  # "field" | "reward"

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


#: Trial metrics reported per task, in display order. Verifier reward metrics
#: are added dynamically from each job's reward keys (see :func:`metric_specs`);
#: this registry declares the rest. ``cost_usd`` and the durations are floats;
#: token counts and step/request counts are ints.
_METRICS: tuple[MetricSpec, ...] = (
    MetricSpec("input_tokens", "total", "input tokens", integer=True),
    MetricSpec("cache_tokens", "total", "cache tokens", integer=True),
    MetricSpec("output_tokens", "total", "output tokens", integer=True),
    MetricSpec("reasoning_tokens", "total", "reasoning tokens", integer=True),
    MetricSpec("n_requests", "total", "model requests", integer=True),
    MetricSpec("n_steps", "total", "steps", integer=True),
    MetricSpec("cost_usd", "total", "cost (USD)"),
    MetricSpec("verifier_tokens", "total", "verifier tokens", integer=True),
    MetricSpec("agent_duration_sec", "mean", "agent duration (s)"),
    MetricSpec("total_duration_sec", "mean", "total duration (s)"),
    MetricSpec("verifier_duration_sec", "mean", "verifier duration (s)"),
)


@dataclass(frozen=True)
class TrialComparison:
    """One task's metrics from both jobs; either side may be absent."""

    task: str
    base: TrialMetrics | None = None
    head: TrialMetrics | None = None


@dataclass(frozen=True)
class Report:
    """A joined two-job comparison: one :class:`TrialComparison` per task."""

    rows: tuple[TrialComparison, ...] = ()


@dataclass(frozen=True)
class SummaryLine:
    """One metric's base/head aggregate for the summary section."""

    spec: MetricSpec
    base: int | float | None = None
    head: int | float | None = None


@dataclass(frozen=True)
class ReportSummary:
    """The aggregated numbers behind the report's summary section.

    ``lines`` holds one aggregate per metric (base/head side); the counts
    summarize the two jobs. Rendering is a pure function of this value, so any
    consumer (Markdown, JSON, …) shares the same numbers.
    """

    base_tasks: int
    head_tasks: int
    base_only: int
    head_only: int
    base_passed: int
    head_passed: int
    lines: tuple[SummaryLine, ...] = ()


def meta_from_job(job: Job) -> JobMeta | None:
    """Extract job-level configuration (models, effort, skill versions).

    Reads each trial through :meth:`harbor_mod.jobs.Trial.meta`; the first
    trial that reports a field fills it. Returns ``None`` when the job
    directory does not exist.
    """
    if not job.path.is_dir():
        return None
    meta = JobMeta()
    for trial in job.iter_trials():
        trial_meta = trial.meta()
        if meta.agent_model is None:
            meta.agent_model = trial_meta.agent_model
        if meta.agent_effort is None:
            meta.agent_effort = trial_meta.agent_effort
        if not meta.skills:
            meta.skills = trial_meta.skills
        if meta.judge_model is None:
            meta.judge_model = trial_meta.judge_model
        if meta.judge_effort is None:
            meta.judge_effort = trial_meta.judge_effort
        if (
            meta.agent_model is not None
            and meta.agent_effort is not None
            and meta.judge_model is not None
            and meta.judge_effort is not None
            and meta.skills
        ):
            break
    return meta


def metrics_from_job(job: Job) -> dict[str, TrialMetrics]:
    """Load per-task metrics from a :class:`Job`.

    Each trial contributes one entry keyed by ``task_name`` through
    :meth:`harbor_mod.jobs.Trial.metrics` (which backfills missing values from
    the trial's raw artifacts). With ``n_attempts > 1`` a task may appear more
    than once: the last completed trial wins. Raises ``FileNotFoundError``
    when the job directory does not exist.
    """
    if not job.path.is_dir():
        raise FileNotFoundError(f"job directory not found: {job.path}")
    out: dict[str, TrialMetrics] = {}
    for trial in job.iter_trials():
        metrics = trial.metrics()
        out[metrics.task_name] = metrics
    return out


def metric_specs(
    base: dict[str, TrialMetrics], head: dict[str, TrialMetrics]
) -> list[MetricSpec]:
    """All metrics to report: dynamic score specs first, then the registry.

    Score specs come from the union of reward keys across both jobs (keyed by
    their ``score.<key>`` document name and read from the rewards via
    ``source="reward"``); the static registry supplies the ordered, labeled
    non-score metrics. Declaring a metric once in the registry — or a reward
    key simply appearing in a job — is all it takes for the per-task table and
    the summary to pick it up.
    """
    reward_keys = sorted(
        {key for m in (*base.values(), *head.values()) for key in m.rewards}
    )
    return [
        MetricSpec(f"score.{key}", "score", source="reward") for key in reward_keys
    ] + list(_METRICS)


def build_report(
    base: dict[str, TrialMetrics], head: dict[str, TrialMetrics]
) -> Report:
    """Join two jobs by task into a typed :class:`Report` (head - base).

    Each task gets one :class:`TrialComparison`; either side may be ``None``
    when the task only ran in one job.
    """
    tasks = sorted(set(base) | set(head))
    return Report(
        rows=tuple(
            TrialComparison(task=task, base=base.get(task), head=head.get(task))
            for task in tasks
        )
    )


def summarize(report: Report, specs: list[MetricSpec]) -> ReportSummary:
    """Aggregate per-task metrics into the report's summary numbers.

    For each spec, the base/head sides are aggregated via
    :meth:`MetricSpec.aggregate` (mean for scores and durations, sum for
    totals). The task and pass counts are derived from the rows once, so the
    renderer and any other consumer share the same numbers.
    """
    base_metrics = [r.base for r in report.rows if r.base]
    head_metrics = [r.head for r in report.rows if r.head]

    def _values(metrics: list[TrialMetrics], spec: MetricSpec) -> list[Any]:
        return [value for m in metrics if (value := spec.read(m)) is not None]

    return ReportSummary(
        base_tasks=len(base_metrics),
        head_tasks=len(head_metrics),
        base_only=sum(1 for r in report.rows if r.base and not r.head),
        head_only=sum(1 for r in report.rows if r.head and not r.base),
        base_passed=sum(1 for m in base_metrics if m.passed),
        head_passed=sum(1 for m in head_metrics if m.passed),
        lines=tuple(
            SummaryLine(
                spec=spec,
                base=spec.aggregate(_values(base_metrics, spec)),
                head=spec.aggregate(_values(head_metrics, spec)),
            )
            for spec in specs
        ),
    )
