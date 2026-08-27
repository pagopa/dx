"""Compare two Harbor job directories and emit a delta report.

Each ``harbor run -c config.yaml`` writes its trials under ``<jobs_dir>/<run>``
(default ``jobs/<timestamp>``): one subdirectory per trial with a
``result.json``. This module reads two such job directories and reports, per
task, the delta of the metrics the run produced:

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

Use it to compare the same eval set run against two versions of a skill (e.g.
the current workspace vs. a git ref loaded with ``harbor run --skill``).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from harbor_mod.jobs import Job, Trial


@dataclass(frozen=True)
class MetricSpec:
    """One reportable metric: its key, display label, and summary aggregation.

    ``kind`` selects how the summary aggregates the metric across tasks:
    ``"score"`` for verifier rewards (mean), ``"total"`` for summed metrics
    (tokens, requests, steps, cost), ``"mean"`` for averaged metrics
    (durations). ``integer`` marks ``"total"`` metrics whose values are whole
    counts (tokens, steps, requests), so their sum is reported as an int. The
    :data:`_METRICS` registry below is the single place a new metric is
    declared: the per-task table, the column label, and the summary line all
    follow from one entry. ``passed`` is a trial-level flag and is reported
    separately, not as a metric.
    """

    key: str
    kind: str = "mean"
    label: str | None = None
    integer: bool = False

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


@dataclass
class TrialMetrics:
    """Metrics extracted from one trial ``result.json``."""

    task_name: str
    rewards: dict[str, float | int]
    input_tokens: int | None = None
    cache_tokens: int | None = None
    output_tokens: int | None = None
    reasoning_tokens: int | None = None
    n_requests: int | None = None
    n_steps: int | None = None
    cost_usd: float | None = None
    verifier_tokens: int | None = None
    agent_duration_sec: float | None = None
    total_duration_sec: float | None = None
    verifier_duration_sec: float | None = None
    passed: bool = True
    trial_name: str | None = None

    def metric(self, name: str) -> Any:
        """Return a metric by name (reward keys are accessed as ``score.<key>``)."""
        if name.startswith("score."):
            return self.rewards.get(name[len("score.") :])
        return getattr(self, name)


@dataclass
class SkillVersion:
    """How a skill was sourced in a job run (local workspace or git cache)."""

    name: str
    kind: str  # "local" | "git"
    path: str
    repo: str | None = None
    ref: str | None = None
    rel_path: str | None = None

    @property
    def version(self) -> str:
        """Human-readable version: ``(local)`` or ``(git: <repo>@<sha>)``."""
        if self.kind == "git":
            short = self.ref[:8] if self.ref else "?"
            return f"(git: {self.repo}@{short})"
        return "(local)"


@dataclass
class JobMeta:
    """Job-level configuration extracted from a job directory."""

    agent_model: str | None = None
    agent_effort: str | None = None
    judge_model: str | None = None
    judge_effort: str | None = None
    skills: list[SkillVersion] = field(default_factory=list)


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


def _parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _seconds(start: str | None, end: str | None) -> float | None:
    started = _parse_timestamp(start)
    finished = _parse_timestamp(end)
    if started is None or finished is None:
        return None
    return max(0.0, (finished - started).total_seconds())


#: Root of Harbor's git-skill cache: ``~/.cache/harbor/skills/<host>/<org>/<repo>/<sha>/<rel_path>``.
_GIT_CACHE_PREFIX = Path.home() / ".cache" / "harbor" / "skills"


def _describe_skill(path_str: str) -> SkillVersion:
    """Classify a skill path as a local workspace skill or a git-cached one.

    Harbor stores ``--skill <url>@<ref>`` checkouts under
    ``~/.cache/harbor/skills/<host>/<org>/<repo>/<sha>/<rel_path>``; the commit
    SHA in the path is the tested git version. Everything else is local.
    """
    try:
        rel = Path(path_str).resolve().relative_to(_GIT_CACHE_PREFIX.resolve())
    except ValueError:
        return SkillVersion(name=Path(path_str).name, kind="local", path=path_str)
    parts = rel.parts
    if len(parts) < 4:
        return SkillVersion(name=Path(path_str).name, kind="local", path=path_str)
    rel_path = "/".join(parts[4:])
    return SkillVersion(
        name=rel_path or parts[-1],
        kind="git",
        path=path_str,
        repo=f"{parts[1]}/{parts[2]}",
        ref=parts[3],
        rel_path=rel_path,
    )


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


def _load_judge_meta(meta: JobMeta, trial: Trial) -> None:
    """Fill judge model/effort from the trial's reward-details.json when still unknown."""
    if meta.judge_model is not None and meta.judge_effort is not None:
        return
    reward = trial.reward_details()
    if reward is None:
        return
    judge = reward.get("judge") or {}
    meta.judge_model = meta.judge_model or judge.get("model")
    meta.judge_effort = meta.judge_effort or judge.get("reasoning_effort")


def meta_from_job(job: Job) -> JobMeta | None:
    """Extract job-level configuration (models, effort, skill versions).

    Reads the first trial's ``result.json`` ``config.agent`` for the session
    model/effort and skill list, and the verifier ``reward-details.json`` for the
    grading (judge) model/effort. Trials with an unreadable ``result.json`` are
    skipped. Returns ``None`` when the job directory does not exist.
    """
    if not job.path.is_dir():
        return None
    meta = JobMeta()
    for trial in job.iter_trials():
        try:
            data = trial.data
        except (OSError, json.JSONDecodeError):
            continue
        agent = (data.get("config") or {}).get("agent") or {}
        if meta.agent_model is None:
            meta.agent_model = agent.get("model_name") or (
                (data.get("agent_info") or {}).get("model_info") or {}
            ).get("name")
        if meta.agent_effort is None:
            meta.agent_effort = (agent.get("kwargs") or {}).get("reasoning_effort")
        if not meta.skills:
            meta.skills = [_describe_skill(path) for path in agent.get("skills") or []]
        _load_judge_meta(meta, trial)
        if (
            meta.agent_model is not None
            and meta.agent_effort is not None
            and meta.judge_model is not None
            and meta.judge_effort is not None
            and meta.skills
        ):
            break
    return meta


def _backfill_from_artifacts(metrics: TrialMetrics, trial: Trial) -> None:
    """Fill metrics ``result.json`` could not report from raw trial artifacts.

    GPT runs leave input/cache tokens and cost unset in ``agent_result``; the
    trial's session database and JSONL stream carry the authoritative numbers
    (see :mod:`harbor_mod.copilot_usage`). Only missing values are replaced, and
    the trajectory file supplies the step count.
    """
    if metrics.n_steps is None:
        metrics.n_steps = trial.trajectory_steps()

    has_all_tokens = all(
        value is not None
        for value in (
            metrics.input_tokens,
            metrics.cache_tokens,
            metrics.output_tokens,
            metrics.cost_usd,
            metrics.n_requests,
            metrics.reasoning_tokens,
        )
    )
    if has_all_tokens:
        return

    usage = trial.usage()
    if usage is None:
        return
    if metrics.input_tokens is None:
        metrics.input_tokens = usage.input_tokens
    if metrics.cache_tokens is None:
        metrics.cache_tokens = usage.cache_tokens
    if metrics.output_tokens is None:
        metrics.output_tokens = usage.output_tokens
    if metrics.reasoning_tokens is None:
        metrics.reasoning_tokens = usage.reasoning_tokens
    if metrics.n_requests is None:
        metrics.n_requests = usage.n_requests or None
    if metrics.cost_usd is None:
        metrics.cost_usd = usage.cost_usd


def metrics_from_job(job: Job) -> dict[str, TrialMetrics]:
    """Load per-task metrics from a :class:`Job`.

    Each trial subdirectory contributes one entry keyed by ``task_name``. With
    ``n_attempts > 1`` a task may appear more than once: the last completed
    trial wins. Missing token/cost/step metrics are backfilled from the trial's
    raw artifacts (see :func:`_backfill_from_artifacts`). Raises
    ``FileNotFoundError`` when the job directory does not exist.
    """
    if not job.path.is_dir():
        raise FileNotFoundError(f"job directory not found: {job.path}")
    out: dict[str, TrialMetrics] = {}
    for trial in job.iter_trials():
        data = trial.data
        agent_result = data.get("agent_result") or {}
        rewards = (data.get("verifier_result") or {}).get("rewards") or {}
        agent_execution = data.get("agent_execution") or {}
        metrics = TrialMetrics(
            task_name=trial.task_name,
            trial_name=data.get("trial_name"),
            rewards=dict(rewards),
            input_tokens=agent_result.get("n_input_tokens"),
            cache_tokens=agent_result.get("n_cache_tokens"),
            output_tokens=agent_result.get("n_output_tokens"),
            cost_usd=agent_result.get("cost_usd"),
            verifier_tokens=trial.verifier_tokens(),
            agent_duration_sec=_seconds(
                agent_execution.get("started_at"),
                agent_execution.get("finished_at"),
            ),
            total_duration_sec=_seconds(
                data.get("started_at"),
                data.get("finished_at"),
            ),
            verifier_duration_sec=_seconds(
                (data.get("verifier") or {}).get("started_at"),
                (data.get("verifier") or {}).get("finished_at"),
            ),
            passed=data.get("exception_info") is None,
        )
        _backfill_from_artifacts(metrics, trial)
        out[metrics.task_name] = metrics
    return out


def load_job(job_dir: Path) -> dict[str, TrialMetrics]:
    """Load per-task metrics from a Harbor job directory.

    Scans ``<job_dir>/*/result.json`` (one subdir per trial) and returns a dict
    keyed by ``task_name``. With ``n_attempts > 1`` a task may appear more than
    once: the last completed trial wins. Missing token/cost/step metrics are
    backfilled from the trial's raw artifacts (see
    :func:`_backfill_from_artifacts`).
    """
    return metrics_from_job(Job(job_dir))


def load_job_meta(job_dir: Path) -> JobMeta | None:
    """Extract job-level configuration (models, effort, skill versions).

    Reads the first trial's ``result.json`` ``config.agent`` for the session
    model/effort and skill list, and the verifier ``reward-details.json`` for the
    grading (judge) model/effort.
    """
    return meta_from_job(Job(job_dir))


def metric_specs(
    base: dict[str, TrialMetrics], head: dict[str, TrialMetrics]
) -> list[MetricSpec]:
    """All metrics to report: dynamic score specs first, then the registry.

    Score specs come from the union of reward keys across both jobs (labeled by
    their ``score.<key>`` name); the static registry supplies the ordered,
    labeled non-score metrics. Declaring a metric once in the registry — or a
    reward key simply appearing in a job — is all it takes for the per-task
    table and the summary to pick it up.
    """
    reward_keys = sorted(
        {key for m in (*base.values(), *head.values()) for key in m.rewards}
    )
    return [MetricSpec(f"score.{key}", "score") for key in reward_keys] + list(_METRICS)


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
    """Delta string (head - base); for booleans show the transition."""
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
        diff = (head or 0.0) - (base or 0.0)
        return f"{diff:+,.3f}" if abs(diff) < 1 else f"{diff:+,.2f}"
    if isinstance(base, int) or isinstance(head, int):
        diff = (head or 0) - (base or 0)
        return f"{diff:+,}"
    return "—"


def summarize(report: Report, specs: list[MetricSpec]) -> ReportSummary:
    """Aggregate per-task metrics into the report's summary numbers.

    For each spec, the base/head sides are aggregated via
    :meth:`MetricSpec.aggregate` (mean for scores and durations, sum for
    totals). The task and pass counts are derived from the rows once, so the
    renderer and any other consumer share the same numbers.
    """
    base_metrics = [r.base for r in report.rows if r.base]
    head_metrics = [r.head for r in report.rows if r.head]

    def _values(metrics: list[TrialMetrics], key: str) -> list[Any]:
        return [m.metric(key) for m in metrics if m.metric(key) is not None]

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
                base=spec.aggregate(_values(base_metrics, spec.key)),
                head=spec.aggregate(_values(head_metrics, spec.key)),
            )
            for spec in specs
        ),
    )


def _render_run_config(
    base_job: str,
    head_job: str,
    base_meta: JobMeta | None,
    head_meta: JobMeta | None,
) -> list[str]:
    """Render the job-level run configuration section (models, skills, diff)."""
    if base_meta is None and head_meta is None:
        return []

    def _model_cell(meta: JobMeta | None) -> str:
        if meta is None or meta.agent_model is None:
            return "—"
        effort = f" (effort: {meta.agent_effort})" if meta.agent_effort else ""
        return f"{meta.agent_model}{effort}"

    def _judge_cell(meta: JobMeta | None) -> str:
        if meta is None or meta.judge_model is None:
            return "—"
        effort = f" (effort: {meta.judge_effort})" if meta.judge_effort else ""
        return f"{meta.judge_model}{effort}"

    def _skills(meta: JobMeta | None) -> str:
        if meta is None or not meta.skills:
            return "—"
        return "<br>".join(f"{s.name} {s.version}" for s in meta.skills)

    lines = ["## Run configuration", ""]
    lines.append(f"| | {base_job} | {head_job} |")
    lines.append("|---|---|---|")
    lines.append(f"| agent model | {_model_cell(base_meta)} | {_model_cell(head_meta)} |")
    lines.append(f"| judge model | {_judge_cell(base_meta)} | {_judge_cell(head_meta)} |")
    lines.append(f"| skills | {_skills(base_meta)} | {_skills(head_meta)} |")
    lines.append("")

    git_cmds = [
        (skill, run)
        for meta, run in ((base_meta, base_job), (head_meta, head_job))
        if meta is not None
        for skill in meta.skills
        if _skill_diff_command(skill) is not None
    ]
    if git_cmds:
        lines.append("Skill diff (local working tree vs. git-loaded version):")
        lines.append("")
        lines.append("```bash")
        for skill, run in git_cmds:
            cmd = _skill_diff_command(skill)
            lines.append(f"# {run} · {skill.name} {skill.version}")
            lines.append(cmd or "")
        lines.append("```")
        lines.append("")
    return lines


def render_markdown(
    base_job: str,
    head_job: str,
    report: Report,
    base_meta: JobMeta | None = None,
    head_meta: JobMeta | None = None,
) -> str:
    """Render the comparison as a Markdown report."""
    base_map = {r.task: r.base for r in report.rows if r.base}
    head_map = {r.task: r.head for r in report.rows if r.head}
    specs = metric_specs(base_map, head_map)

    lines = [
        f"# Skill comparison: `{base_job}` → `{head_job}`",
        "",
        "Delta is **head − base**. ",
        "",
    ]
    lines.extend(_render_run_config(base_job, head_job, base_meta, head_meta))

    # --- Per-task tables -------------------------------------------------
    lines.append("## Per-task delta")
    lines.append("")
    for row in report.rows:
        task = row.task
        base, head = row.base, row.head
        lines.append(f"### {task}")
        lines.append("")
        lines.append("| metric | base | head | Δ |")
        lines.append("|---|---|---|---|")
        for spec in specs:
            lines.append(
                f"| {spec.display_label} | {_fmt(base.metric(spec.key)) if base else '—'} | "
                f"{_fmt(head.metric(spec.key)) if head else '—'} | "
                f"{_delta(base.metric(spec.key) if base else None, head.metric(spec.key) if head else None)} |"
            )
        lines.append("")

    # --- Summary ---------------------------------------------------------
    summary = summarize(report, specs)
    lines.append("## Summary")
    lines.append("")
    lines.append(
        f"- tasks in base: {summary.base_tasks}; in head: {summary.head_tasks}"
    )
    lines.append(
        f"- tasks only in base: {summary.base_only}; "
        f"only in head: {summary.head_only}"
    )
    for line in summary.lines:
        lines.append(
            f"- {line.spec.display_label}: {line.spec.summary_word} "
            f"{_fmt(line.base)} → {_fmt(line.head)}"
        )
    lines.append(
        f"- passed trials: {summary.base_passed}/{summary.base_tasks} → "
        f"{summary.head_passed}/{summary.head_tasks}"
    )
    lines.append("")

    return "\n".join(lines)
