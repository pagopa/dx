"""Diff two Harbor job directories and emit a delta report.

Each ``harbor run -c config.yaml`` writes its trials under ``<jobs_dir>/<run>``
(default ``jobs/<timestamp>``): one subdirectory per trial with a
``result.json``. Jobs and trials are read through :mod:`harbor_bench.jobs`,
which owns the trial-directory layout and the ``result.json`` schema: a
:class:`~harbor_bench.jobs.Job` reads its directory once and derives the
per-task metrics (:meth:`~harbor_bench.jobs.Job.metrics`) and the job-level run
configuration (:meth:`~harbor_bench.jobs.Job.meta`) from that one read. This
module joins two such jobs and reports, per task, the delta of the metrics
the run produced:

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
aggregating. :func:`build_document` turns a joined :class:`Report` and the
job-level metadata into one complete :class:`ReportDocument` (rows, metric
specs, summary, run-configuration skill diffs), so the compute happens exactly
once. The Markdown and JSON rendering of that document lives in
:mod:`harbor_bench.report`, which consumes the typed values here and owns the
number/delta formatting and the run-configuration cells.

Use it to diff the same eval set run against two versions of a skill (e.g.
the current workspace vs. a git ref loaded with ``harbor run --skill``).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from harbor_bench.jobs import JobMeta, SkillVersion, TrialMetrics
from harbor_bench.metrics import METRIC_SPECS, MetricSpec


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


@dataclass(frozen=True)
class SkillDiff:
    """A ready-to-run ``git diff`` between a git-loaded skill and the local checkout."""

    run: str
    skill: SkillVersion
    command: str


def _skill_diff_command(skill: SkillVersion) -> str | None:
    """A ready-to-run ``git diff`` between the remote skill version and the local checkout.

    Compares the working tree (the locally tested skill) against the git ref the
    remote run loaded (``pagopa/dx@<sha>``), restricted to the skill path. Runs
    from anywhere inside the repo thanks to the ``rev-parse`` substitution.
    """
    if skill.kind != "git" or not skill.ref or not skill.rel_path:
        return None
    return (
        f'git -C "$(git rev-parse --show-toplevel)" diff {skill.ref} '
        f"-- {skill.rel_path}"
    )


@dataclass(frozen=True)
class ReportDocument:
    """A complete two-job comparison: rows, metric specs, summary, run config.

    Built once by :func:`build_document`; every renderer (Markdown, JSON, …) is
    a pure adapter over this value, so the metric specs, the aggregated summary,
    and the run-configuration git-diff selection are decided exactly once
    instead of once per renderer.
    """

    base_job: str
    head_job: str
    rows: tuple[TrialComparison, ...]
    specs: tuple[MetricSpec, ...]
    summary: ReportSummary
    base_meta: JobMeta | None = None
    head_meta: JobMeta | None = None
    skill_diffs: tuple[SkillDiff, ...] = ()


def build_document(
    base_job: str,
    head_job: str,
    report: Report,
    base_meta: JobMeta | None = None,
    head_meta: JobMeta | None = None,
) -> ReportDocument:
    """Join a report and its job-level metadata into one complete document.

    Computes the metric specs (static registry plus the union of reward keys),
    the aggregated summary, and the run-configuration git-diff selection once.
    Renderers consume this value and only format it.
    """
    base_map = {r.task: r.base for r in report.rows if r.base}
    head_map = {r.task: r.head for r in report.rows if r.head}
    specs = metric_specs(base_map, head_map)
    summary = summarize(report, specs)
    skill_diffs = tuple(
        SkillDiff(run=run, skill=skill, command=command)
        for meta, run in ((base_meta, base_job), (head_meta, head_job))
        if meta is not None
        for skill in meta.skills
        if (command := _skill_diff_command(skill)) is not None
    )
    return ReportDocument(
        base_job=base_job,
        head_job=head_job,
        rows=report.rows,
        specs=tuple(specs),
        summary=summary,
        base_meta=base_meta,
        head_meta=head_meta,
        skill_diffs=skill_diffs,
    )


def metric_specs(
    base: dict[str, TrialMetrics], head: dict[str, TrialMetrics]
) -> list[MetricSpec]:
    """All metrics to report: dynamic score specs first, then the registry.

    Score specs come from the union of reward keys across both jobs (keyed by
    their ``score.<key>`` document name and read from the rewards via
    ``source="reward"``); :data:`harbor_bench.metrics.METRIC_SPECS` supplies the
    ordered, labeled non-score metrics. Declaring a metric once in the
    registry — or a reward key simply appearing in a job — is all it takes for
    the per-task table and the summary to pick it up.
    """
    reward_keys = sorted(
        {key for m in (*base.values(), *head.values()) for key in m.rewards}
    )
    return [
        MetricSpec(f"score.{key}", "score", source="reward") for key in reward_keys
    ] + list(METRIC_SPECS)


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
