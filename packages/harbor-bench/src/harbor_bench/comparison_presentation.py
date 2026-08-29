"""Build the renderer-neutral presentation of a Harbor comparison."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote

from harbor_bench.diff import JobMeta, ReportDocument, TrialComparison
from harbor_bench.jobs import SkillVersion, TrialMetrics
from harbor_bench.metrics import MetricSpec


@dataclass(frozen=True)
class SkillPresentation:
    """One skill as displayed in a run configuration."""

    name: str
    version: str
    kind: str
    path: str
    repo: str | None
    ref: str | None
    rel_path: str | None
    source_url: str | None


@dataclass(frozen=True)
class RunPresentation:
    """One side of the comparison with its recorded configuration."""

    label: str
    kind: str
    job: str
    job_label: str
    agent_model: str | None
    agent_effort: str | None
    judge_model: str | None
    judge_effort: str | None
    agent: str
    judge: str
    skills: tuple[SkillPresentation, ...]
    meta_present: bool


@dataclass(frozen=True)
class MetricPresentation:
    """One metric comparison in raw and display-ready forms."""

    key: str
    label: str
    summary_word: str
    base_value: Any
    head_value: Any
    base: str
    head: str
    delta: str
    direction: str
    headline_group: str | None


@dataclass(frozen=True)
class TaskSidePresentation:
    """One task side as exposed by structured renderers."""

    values: dict[str, Any]
    passed: bool
    status: str


@dataclass(frozen=True)
class TaskPresentation:
    """One task comparison with its outcome and metric rows."""

    name: str
    outcome: str
    outcome_label: str
    score_label: str
    base_score: str
    head_score: str
    score_direction: str
    score_delta: str
    metrics: tuple[MetricPresentation, ...]
    base_side: TaskSidePresentation | None
    head_side: TaskSidePresentation | None


@dataclass(frozen=True)
class OutcomePresentation:
    """One task-outcome category."""

    key: str
    label: str
    count: int


@dataclass(frozen=True)
class PopulationPresentation:
    """Whole-job task and pass counts."""

    base_tasks: int
    head_tasks: int
    base_only: int
    head_only: int
    base_passed: int
    head_passed: int


@dataclass(frozen=True)
class ComparablePresentation:
    """Statistics calculated only from tasks present in both jobs."""

    tasks: int
    evaluated_tasks: int
    base_passed: int
    head_passed: int
    base_rate_value: float | None
    head_rate_value: float | None
    base_rate: str
    head_rate: str
    pass_rate_direction: str
    pass_rate_delta: str


@dataclass(frozen=True)
class SkillDiffPresentation:
    """One ready-to-run skill diff command."""

    run: str
    name: str
    version: str
    command: str


@dataclass(frozen=True)
class ComparisonPresentation:
    """The complete presentation consumed by every rendering adapter."""

    base_job: str
    head_job: str
    base_job_label: str
    head_job_label: str
    verdict: str
    verdict_kind: str
    score: MetricPresentation
    population: PopulationPresentation
    comparable: ComparablePresentation
    outcomes: tuple[OutcomePresentation, ...]
    summary_metrics: tuple[MetricPresentation, ...]
    comparison_metrics: tuple[MetricPresentation, ...]
    run_cards: tuple[RunPresentation, ...]
    skill_diffs: tuple[SkillDiffPresentation, ...]
    tasks: tuple[TaskPresentation, ...]


def _fmt(value: Any) -> str:
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "pass" if value else "FAIL"
    if isinstance(value, float):
        if abs(value) < 1:
            return f"{value:.3f}"
        return f"{value:,.2f}"
    if isinstance(value, int):
        return f"{value:,}"
    return str(value)


def _delta(base: Any, head: Any) -> str:
    """Format the head-minus-base change."""
    if base is None and head is None:
        return "—"
    if base is None:
        return f"(new) {_fmt(head)}"
    if head is None:
        return f"(only base) {_fmt(base)}"
    if isinstance(base, bool) or isinstance(head, bool):
        if base == head:
            return _fmt(base)
        return f"{_fmt(base)} → {_fmt(head)}"
    if isinstance(base, float) or isinstance(head, float):
        difference = (head or 0.0) - (base or 0.0)
        return (
            f"{difference:+,.3f}"
            if abs(difference) < 1
            else f"{difference:+,.2f}"
        )
    if isinstance(base, int) or isinstance(head, int):
        return f"{(head or 0) - (base or 0):+,}"
    return "—"


def _numeric(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _direction(
    base: Any,
    head: Any,
    spec: MetricSpec | None = None,
) -> str:
    base_number = _numeric(base)
    head_number = _numeric(head)
    if base_number is None or head_number is None or head_number == base_number:
        return "neutral"
    if spec is not None and spec.preference == "neutral":
        return "neutral"
    improved = head_number > base_number
    if spec is not None and spec.preference == "lower":
        improved = not improved
    return "positive" if improved else "negative"


def _metric(
    spec: MetricSpec,
    base: Any,
    head: Any,
) -> MetricPresentation:
    return MetricPresentation(
        key=spec.key,
        label=spec.display_label,
        summary_word=spec.summary_word,
        base_value=base,
        head_value=head,
        base=_fmt(base),
        head=_fmt(head),
        delta=_delta(base, head),
        direction=_direction(base, head, spec),
        headline_group=spec.headline_group,
    )


def _source_url(skill: SkillVersion) -> str | None:
    if skill.kind == "git" and skill.repo and skill.ref and skill.rel_path:
        repo = quote(skill.repo, safe="/")
        ref = quote(skill.ref, safe="")
        rel_path = quote(skill.rel_path.strip("/"), safe="/")
        return f"https://github.com/{repo}/tree/{ref}/{rel_path}"
    return None


def _skill(skill: SkillVersion) -> SkillPresentation:
    return SkillPresentation(
        name=skill.name,
        version=skill.version,
        kind=skill.kind,
        path=skill.path,
        repo=skill.repo,
        ref=skill.ref,
        rel_path=skill.rel_path,
        source_url=_source_url(skill),
    )


def _job_label(job: str) -> str:
    normalized = job.replace("\\", "/").rstrip("/")
    return normalized.rsplit("/", 1)[-1] or job


def _run(label: str, job: str, meta: JobMeta | None) -> RunPresentation:
    agent_model = meta.agent_model if meta else None
    agent_display = agent_model or "Not recorded"
    agent_effort = (
        f" (effort: {meta.agent_effort})" if meta and meta.agent_effort else ""
    )
    judge_model = meta.judge_model if meta else None
    judge_display = judge_model or "Not recorded"
    judge_effort = (
        f" (effort: {meta.judge_effort})" if meta and meta.judge_effort else ""
    )
    return RunPresentation(
        label=label,
        kind=label.lower(),
        job=job,
        job_label=_job_label(job),
        agent_model=agent_model,
        agent_effort=meta.agent_effort if meta else None,
        judge_model=judge_model,
        judge_effort=meta.judge_effort if meta else None,
        agent=agent_display + agent_effort,
        judge=judge_display + judge_effort,
        skills=tuple(_skill(skill) for skill in meta.skills) if meta else (),
        meta_present=meta is not None,
    )


def _primary_score_spec(document: ReportDocument) -> MetricSpec | None:
    score_specs = tuple(
        spec for spec in document.specs if spec.key.startswith("score.")
    )
    return next(
        (spec for spec in score_specs if spec.key == "score.quality"),
        score_specs[0] if score_specs else None,
    )


def _paired_metric(
    rows: tuple[TrialComparison, ...],
    spec: MetricSpec,
) -> tuple[Any, Any]:
    pairs = [
        (base_value, head_value)
        for row in rows
        if row.base is not None and row.head is not None
        if (base_value := spec.read(row.base)) is not None
        if (head_value := spec.read(row.head)) is not None
    ]
    return (
        spec.aggregate([base for base, _ in pairs]),
        spec.aggregate([head for _, head in pairs]),
    )


def _task_outcome(
    base: TrialMetrics | None,
    head: TrialMetrics | None,
    primary_score: MetricSpec | None,
) -> tuple[str, str]:
    if base is None:
        return "new", "New task"
    if head is None:
        return "removed", "Only in base"
    if base.status == "incomplete" or head.status == "incomplete":
        if base.status == head.status:
            return "incomplete", "Incomplete"
        return (
            ("improved", "Improved")
            if base.status == "incomplete"
            else ("regressed", "Regressed")
        )
    if base.passed != head.passed:
        return ("improved", "Improved") if head.passed else ("regressed", "Regressed")
    if primary_score is not None:
        direction = _direction(
            primary_score.read(base),
            primary_score.read(head),
            primary_score,
        )
        if direction == "positive":
            return "improved", "Improved"
        if direction == "negative":
            return "regressed", "Regressed"
    return "unchanged", "Unchanged"


def _task_side(
    metrics: TrialMetrics | None,
    specs: tuple[MetricSpec, ...],
) -> TaskSidePresentation | None:
    if metrics is None:
        return None
    return TaskSidePresentation(
        values={spec.key: spec.read(metrics) for spec in specs},
        passed=metrics.passed,
        status=metrics.status,
    )


def _task(
    row: TrialComparison,
    specs: tuple[MetricSpec, ...],
    primary_score: MetricSpec | None,
) -> TaskPresentation:
    outcome, outcome_label = _task_outcome(row.base, row.head, primary_score)
    if (
        (row.base is not None and row.base.status == "incomplete")
        or (row.head is not None and row.head.status == "incomplete")
    ):
        score_label = "Run status"
        base_score = row.base.status.capitalize() if row.base else None
        head_score = row.head.status.capitalize() if row.head else None
        score_direction = (
            "positive"
            if outcome == "improved"
            else "negative"
            if outcome == "regressed"
            else "neutral"
        )
        score_delta = (
            base_score
            if base_score == head_score
            else f"{base_score or '—'} → {head_score or '—'}"
        )
    elif primary_score is None:
        score_label = "Pass status"
        base_score = row.base.passed if row.base else None
        head_score = row.head.passed if row.head else None
        if base_score is None or head_score is None or base_score == head_score:
            score_direction = "neutral"
        else:
            score_direction = "positive" if head_score else "negative"
        score_delta = _delta(base_score, head_score)
    else:
        score_label = primary_score.display_label
        base_score = primary_score.read(row.base) if row.base else None
        head_score = primary_score.read(row.head) if row.head else None
        score_direction = _direction(base_score, head_score, primary_score)
        score_delta = _delta(base_score, head_score)

    return TaskPresentation(
        name=row.task,
        outcome=outcome,
        outcome_label=outcome_label,
        score_label=score_label,
        base_score=_fmt(base_score),
        head_score=_fmt(head_score),
        score_direction=score_direction,
        score_delta=score_delta,
        metrics=tuple(
            _metric(
                spec,
                spec.read(row.base) if row.base else None,
                spec.read(row.head) if row.head else None,
            )
            for spec in specs
        ),
        base_side=_task_side(row.base, specs),
        head_side=_task_side(row.head, specs),
    )


def _percentage(value: float | None) -> str:
    return "—" if value is None else f"{value:.0%}"


def _verdict(
    comparable_tasks: int,
    evaluated_tasks: int,
    score_direction: str,
    pass_direction: str,
) -> tuple[str, str]:
    if comparable_tasks == 0:
        return "No comparable results", "neutral"
    if evaluated_tasks == 0:
        return "No completed comparable results", "neutral"
    directions = {
        direction
        for direction in (score_direction, pass_direction)
        if direction != "neutral"
    }
    if directions == {"positive"}:
        return "Head performs better", "positive"
    if directions == {"negative"}:
        return "Base performs better", "negative"
    if len(directions) > 1:
        return "Results are mixed", "mixed"
    return "No clear change", "neutral"


def build_presentation(document: ReportDocument) -> ComparisonPresentation:
    """Build all comparison semantics once for Markdown, HTML, and JSON."""
    comparable_rows = tuple(
        row for row in document.rows if row.base is not None and row.head is not None
    )
    comparable_tasks = len(comparable_rows)
    evaluated_rows = tuple(
        row
        for row in comparable_rows
        if row.base is not None
        and row.head is not None
        and row.base.status != "incomplete"
        and row.head.status != "incomplete"
    )
    evaluated_tasks = len(evaluated_rows)
    comparable_base_passed = sum(
        1 for row in evaluated_rows if row.base and row.base.passed
    )
    comparable_head_passed = sum(
        1 for row in evaluated_rows if row.head and row.head.passed
    )
    base_rate = (
        comparable_base_passed / evaluated_tasks if evaluated_tasks else None
    )
    head_rate = (
        comparable_head_passed / evaluated_tasks if evaluated_tasks else None
    )
    pass_direction = _direction(base_rate, head_rate)

    summary_metrics = tuple(
        _metric(line.spec, line.base, line.head) for line in document.summary.lines
    )
    comparison_metrics = tuple(
        _metric(spec, *_paired_metric(evaluated_rows, spec))
        for spec in document.specs
    )
    primary_score = _primary_score_spec(document)
    primary_metric = next(
        (
            metric
            for metric in comparison_metrics
            if primary_score is not None and metric.key == primary_score.key
        ),
        None,
    )
    if primary_metric is None or (
        primary_metric.base_value is None and primary_metric.head_value is None
    ):
        score = MetricPresentation(
            key="success_rate",
            label="Success rate",
            summary_word="mean",
            base_value=base_rate,
            head_value=head_rate,
            base=_percentage(base_rate),
            head=_percentage(head_rate),
            delta=_delta(base_rate, head_rate),
            direction=pass_direction,
            headline_group=None,
        )
    else:
        score = primary_metric

    verdict, verdict_kind = _verdict(
        comparable_tasks,
        evaluated_tasks,
        score.direction,
        pass_direction,
    )
    counts = {
        key: 0
        for key in (
            "improved",
            "regressed",
            "unchanged",
            "incomplete",
            "new",
            "removed",
        )
    }
    tasks = tuple(
        _task(row, document.specs, primary_score) for row in document.rows
    )
    for task in tasks:
        counts[task.outcome] += 1
    outcome_labels = (
        ("improved", "Improved"),
        ("regressed", "Regressed"),
        ("unchanged", "Unchanged"),
        ("incomplete", "Incomplete"),
        ("new", "New"),
        ("removed", "Only in base"),
    )
    outcomes = tuple(
        OutcomePresentation(
            key=key,
            label=label,
            count=counts[key],
        )
        for key, label in outcome_labels
        if counts[key]
    )
    return ComparisonPresentation(
        base_job=document.base_job,
        head_job=document.head_job,
        base_job_label=_job_label(document.base_job),
        head_job_label=_job_label(document.head_job),
        verdict=verdict,
        verdict_kind=verdict_kind,
        score=score,
        population=PopulationPresentation(
            base_tasks=document.summary.base_tasks,
            head_tasks=document.summary.head_tasks,
            base_only=document.summary.base_only,
            head_only=document.summary.head_only,
            base_passed=document.summary.base_passed,
            head_passed=document.summary.head_passed,
        ),
        comparable=ComparablePresentation(
            tasks=comparable_tasks,
            evaluated_tasks=evaluated_tasks,
            base_passed=comparable_base_passed,
            head_passed=comparable_head_passed,
            base_rate_value=base_rate,
            head_rate_value=head_rate,
            base_rate=_percentage(base_rate),
            head_rate=_percentage(head_rate),
            pass_rate_direction=pass_direction,
            pass_rate_delta=_delta(base_rate, head_rate),
        ),
        outcomes=outcomes,
        summary_metrics=summary_metrics,
        comparison_metrics=comparison_metrics,
        run_cards=(
            _run("Base", document.base_job, document.base_meta),
            _run("Head", document.head_job, document.head_meta),
        ),
        skill_diffs=tuple(
            SkillDiffPresentation(
                run=diff.run,
                name=diff.skill.name,
                version=diff.skill.version,
                command=diff.command,
            )
            for diff in document.skill_diffs
        ),
        tasks=tasks,
    )
