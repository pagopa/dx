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

from harbor_mod.copilot_usage import extract_trial_usage

JSON = dict[str, Any]

@dataclass(frozen=True)
class MetricSpec:
    """One reportable metric: its key, display label, and summary aggregation.

    ``kind`` selects how the summary aggregates the metric across tasks:
    ``"score"`` for verifier rewards (mean), ``"total"`` for summed metrics
    (tokens, requests, steps, cost), ``"mean"`` for averaged metrics
    (durations). The :data:`_METRICS` registry below is the single place a new
    metric is declared: the per-task table, the column label, and the summary
    line all follow from one entry. ``passed`` is a trial-level flag and is
    reported separately, not as a metric.
    """

    key: str
    kind: str = "mean"
    label: str | None = None

    @property
    def display_label(self) -> str:
        return self.label or self.key


#: Trial metrics reported per task, in display order. Verifier reward metrics
#: are added dynamically from each job's reward keys (see :func:`metric_specs`);
#: this registry declares the rest. ``cost_usd`` and the durations are floats;
#: token counts and step/request counts are ints.
_METRICS: tuple[MetricSpec, ...] = (
    MetricSpec("input_tokens", "total", "input tokens"),
    MetricSpec("cache_tokens", "total", "cache tokens"),
    MetricSpec("output_tokens", "total", "output tokens"),
    MetricSpec("reasoning_tokens", "total", "reasoning tokens"),
    MetricSpec("n_requests", "total", "model requests"),
    MetricSpec("n_steps", "total", "steps"),
    MetricSpec("cost_usd", "total", "cost (USD)"),
    MetricSpec("verifier_tokens", "total", "verifier tokens"),
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


def _normalize_usage(usage: dict[str, Any]) -> tuple[int, int]:
    """Extract (input, output) token counts from a LiteLLM usage dict."""
    inp = usage.get("input_tokens") or usage.get("prompt_tokens") or 0
    out = usage.get("output_tokens") or usage.get("completion_tokens") or 0
    try:
        return int(inp), int(out)
    except (TypeError, ValueError):
        return 0, 0


def _load_reward_details(trial_dir: Path) -> dict[str, Any] | None:
    """The ``reward`` dict from ``verifier/reward-details.json``, or ``None``.

    Both verifier-token counts and the judge model/effort metadata are read
    from this one file; this helper is the only place that knows its shape.
    """
    details = trial_dir / "verifier" / "reward-details.json"
    if not details.is_file():
        return None
    try:
        reward = (json.loads(details.read_text(encoding="utf-8")) or {}).get("reward") or {}
    except (OSError, json.JSONDecodeError):
        return None
    return reward


def _verifier_tokens(trial_dir: Path) -> int | None:
    """Total verifier (judge) tokens for a trial.

    Prefers ``verifier/usage.jsonl`` — one line per judge LLM call, written by
    the ``test.sh`` LiteLLM shim (see the ``tests/test.sh`` template). Falls
    back to ``reward.usage`` in ``reward-details.json`` (normalized
    ``JudgeUsage`` persisted by agent-mode judges or future rewardkit versions).
    Returns ``None`` when no usage was recorded.
    """
    usage_file = trial_dir / "verifier" / "usage.jsonl"
    if usage_file.is_file():
        total = 0
        saw = False
        try:
            lines = usage_file.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            lines = []
        for line in lines:
            if not line.strip():
                continue
            try:
                usage = (json.loads(line) or {}).get("usage") or {}
            except json.JSONDecodeError:
                continue
            inp, out = _normalize_usage(usage)
            if inp or out:
                total += inp + out
                saw = True
        if saw:
            return total

    reward = _load_reward_details(trial_dir)
    if reward is None:
        return None
    usage = reward.get("usage")
    if not isinstance(usage, dict):
        return None
    total = (usage.get("input_tokens") or 0) + (usage.get("output_tokens") or 0)
    return int(total) if total else None


def _load_judge_meta(data: JSON, trial_dir: Path, meta: JobMeta) -> None:
    """Fill judge model/effort from reward-details.json when still unknown."""
    if meta.judge_model is not None and meta.judge_effort is not None:
        return
    reward = _load_reward_details(trial_dir)
    if reward is None:
        return
    judge = reward.get("judge") or {}
    meta.judge_model = meta.judge_model or judge.get("model")
    meta.judge_effort = meta.judge_effort or judge.get("reasoning_effort")


def load_job_meta(job_dir: Path) -> JobMeta | None:
    """Extract job-level configuration (models, effort, skill versions).

    Reads the first trial's ``result.json`` ``config.agent`` for the session
    model/effort and skill list, and the verifier ``reward-details.json`` for the
    grading (judge) model/effort.
    """
    if not job_dir.is_dir():
        return None
    meta = JobMeta()
    for trial_dir in sorted(p for p in job_dir.iterdir() if p.is_dir()):
        result_path = trial_dir / "result.json"
        if not result_path.is_file():
            continue
        try:
            data = json.loads(result_path.read_text(encoding="utf-8"))
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
        _load_judge_meta(data, trial_dir, meta)
        if (
            meta.agent_model is not None
            and meta.agent_effort is not None
            and meta.judge_model is not None
            and meta.judge_effort is not None
            and meta.skills
        ):
            break
    return meta


def _trajectory_steps(path: Path) -> int | None:
    """Read ``final_metrics.total_steps`` from an ATIF trajectory file."""
    if not path.is_file():
        return None
    try:
        trajectory = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return (trajectory.get("final_metrics") or {}).get("total_steps")


def _backfill_from_artifacts(metrics: TrialMetrics, trial_dir: Path) -> None:
    """Fill metrics ``result.json`` could not report from raw trial artifacts.

    GPT runs leave input/cache tokens and cost unset in ``agent_result``; the
    trial's session database and JSONL stream carry the authoritative numbers
    (see :mod:`harbor_mod.copilot_usage`). Only missing values are replaced, and
    the trajectory file supplies the step count.
    """
    if metrics.n_steps is None:
        metrics.n_steps = _trajectory_steps(trial_dir / "agent" / "trajectory.json")

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

    usage = extract_trial_usage(trial_dir)
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


def load_job(job_dir: Path) -> dict[str, TrialMetrics]:
    """Load per-task metrics from a Harbor job directory.

    Scans ``<job_dir>/*/result.json`` (one subdir per trial) and returns a dict
    keyed by ``task_name``. With ``n_attempts > 1`` a task may appear more than
    once: the last completed trial wins. Missing token/cost/step metrics are
    backfilled from the trial's raw artifacts (see
    :func:`_backfill_from_artifacts`).
    """
    if not job_dir.is_dir():
        raise FileNotFoundError(f"job directory not found: {job_dir}")
    out: dict[str, TrialMetrics] = {}
    for trial_dir in sorted(p for p in job_dir.iterdir() if p.is_dir()):
        result_path = trial_dir / "result.json"
        if not result_path.is_file():
            continue
        data = json.loads(result_path.read_text(encoding="utf-8"))
        agent_result = data.get("agent_result") or {}
        rewards = (data.get("verifier_result") or {}).get("rewards") or {}
        agent_execution = data.get("agent_execution") or {}
        metrics = TrialMetrics(
            task_name=data.get("task_name", trial_dir.name),
            trial_name=data.get("trial_name"),
            rewards=dict(rewards),
            input_tokens=agent_result.get("n_input_tokens"),
            cache_tokens=agent_result.get("n_cache_tokens"),
            output_tokens=agent_result.get("n_output_tokens"),
            cost_usd=agent_result.get("cost_usd"),
            verifier_tokens=_verifier_tokens(trial_dir),
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
        _backfill_from_artifacts(metrics, trial_dir)
        out[metrics.task_name] = metrics
    return out


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


def _totals(metrics: list[TrialMetrics], name: str) -> int | float | None:
    values = [m.metric(name) for m in metrics if m.metric(name) is not None]
    if not values:
        return None
    total = sum(values)
    if name in ("input_tokens", "cache_tokens", "output_tokens"):
        return int(total)
    return total


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


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
    base_metrics = [r.base for r in report.rows if r.base]
    head_metrics = [r.head for r in report.rows if r.head]
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- tasks in base: {len(base_metrics)}; in head: {len(head_metrics)}")
    lines.append(
        f"- tasks only in base: {sum(1 for r in report.rows if r.base and not r.head)}; "
        f"only in head: {sum(1 for r in report.rows if r.head and not r.base)}"
    )

    for spec in specs:
        base_values = [
            m.metric(spec.key) for m in base_metrics if m.metric(spec.key) is not None
        ]
        head_values = [
            m.metric(spec.key) for m in head_metrics if m.metric(spec.key) is not None
        ]
        if spec.kind == "score":
            b_mean = _mean(base_values)
            h_mean = _mean(head_values)
            lines.append(
                f"- {spec.display_label}: mean "
                f"{_fmt(b_mean)} → {_fmt(h_mean)}"
            )
        elif spec.kind == "total":
            lines.append(
                f"- {spec.display_label}: total "
                f"{_fmt(_totals(base_metrics, spec.key))} → "
                f"{_fmt(_totals(head_metrics, spec.key))}"
            )
        else:
            b_mean = _mean(base_values)
            h_mean = _mean(head_values)
            lines.append(
                f"- {spec.display_label}: mean "
                f"{_fmt(b_mean)} → {_fmt(h_mean)}"
            )
    pass_delta = (
        f"{sum(1 for m in base_metrics if m.passed)}/{len(base_metrics)} → "
        f"{sum(1 for m in head_metrics if m.passed)}/{len(head_metrics)}"
    )
    lines.append(f"- passed trials: {pass_delta}")
    lines.append("")

    return "\n".join(lines)
