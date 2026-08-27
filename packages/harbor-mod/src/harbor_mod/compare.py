"""Compare two Harbor job directories and emit a delta report.

Each ``harbor run -c config.yaml`` writes its trials under ``<jobs_dir>/<run>``
(default ``jobs/<timestamp>``): one subdirectory per trial with a
``result.json``. This module reads two such job directories and reports, per
task, the delta of the metrics the run produced:

- score: the verifier rewards (e.g. RewardKit criteria in ``verifier_result``)
- tokens: agent input/cache/output tokens
- cost: agent execution cost in USD
- duration: agent execution and total trial wall-clock
- pass/fail: whether the trial completed without an exception

Use it to compare the same eval set run against two versions of a skill (e.g.
the current workspace vs. a git ref loaded with ``harbor run --skill``).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

JSON = dict[str, Any]

#: Trial metrics reported per task (in display order). ``cost_usd`` and the
#: durations are floats; token counts are ints; ``passed`` is a bool.
_METRIC_ORDER = (
    "input_tokens",
    "cache_tokens",
    "output_tokens",
    "cost_usd",
    "agent_duration_sec",
    "total_duration_sec",
)

_METRIC_LABELS = {
    "input_tokens": "input tokens",
    "cache_tokens": "cache tokens",
    "output_tokens": "output tokens",
    "cost_usd": "cost (USD)",
    "agent_duration_sec": "agent duration (s)",
    "total_duration_sec": "total duration (s)",
}


@dataclass
class TrialMetrics:
    """Metrics extracted from one trial ``result.json``."""

    task_name: str
    rewards: dict[str, float | int]
    input_tokens: int | None = None
    cache_tokens: int | None = None
    output_tokens: int | None = None
    cost_usd: float | None = None
    agent_duration_sec: float | None = None
    total_duration_sec: float | None = None
    passed: bool = True
    trial_name: str | None = None

    def metric(self, name: str) -> Any:
        """Return a metric by name (reward keys are accessed as ``score.<key>``)."""
        if name.startswith("score."):
            return self.rewards.get(name[len("score.") :])
        return getattr(self, name)


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


def load_job(job_dir: Path) -> dict[str, TrialMetrics]:
    """Load per-task metrics from a Harbor job directory.

    Scans ``<job_dir>/*/result.json`` (one subdir per trial) and returns a dict
    keyed by ``task_name``. With ``n_attempts > 1`` a task may appear more than
    once: the last completed trial wins.
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
        out[data.get("task_name", trial_dir.name)] = TrialMetrics(
            task_name=data.get("task_name", trial_dir.name),
            trial_name=data.get("trial_name"),
            rewards=dict(rewards),
            input_tokens=agent_result.get("n_input_tokens"),
            cache_tokens=agent_result.get("n_cache_tokens"),
            output_tokens=agent_result.get("n_output_tokens"),
            cost_usd=agent_result.get("cost_usd"),
            agent_duration_sec=_seconds(
                agent_execution.get("started_at"),
                agent_execution.get("finished_at"),
            ),
            total_duration_sec=_seconds(
                data.get("started_at"),
                data.get("finished_at"),
            ),
            passed=data.get("exception_info") is None,
        )
    return out


def metric_names(
    base: dict[str, TrialMetrics], head: dict[str, TrialMetrics]
) -> list[str]:
    """All metric names to compare, reward keys flattened as ``score.<key>``."""
    reward_keys = sorted(
        {key for m in (*base.values(), *head.values()) for key in m.rewards}
    )
    return [f"score.{key}" for key in reward_keys] + list(_METRIC_ORDER)


def build_report(
    base: dict[str, TrialMetrics], head: dict[str, TrialMetrics]
) -> dict[str, Any]:
    """Join two jobs by task and compute deltas (head - base).

    Returns ``{"base_job": ..., "head_job": ..., "rows": [...]}`` where each row
    is ``{"task", "base", "head"}`` (either side may be None when the task only
    ran in one job).
    """
    tasks = sorted(set(base) | set(head))
    return {
        "rows": [
            {
                "task": task,
                "base": base.get(task),
                "head": head.get(task),
            }
            for task in tasks
        ]
    }


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


def render_markdown(
    base_job: str, head_job: str, report: dict[str, Any]
) -> str:
    """Render the comparison as a Markdown report."""
    rows: list[dict[str, Any]] = report["rows"]
    base_map = {r["task"]: r["base"] for r in rows if r["base"]}
    head_map = {r["task"]: r["head"] for r in rows if r["head"]}
    names = metric_names(base_map, head_map)

    lines = [
        f"# Skill comparison: `{base_job}` → `{head_job}`",
        "",
        "Delta is **head − base**. ",
        "",
    ]

    # --- Per-task tables -------------------------------------------------
    lines.append("## Per-task delta")
    lines.append("")
    for row in rows:
        task = row["task"]
        base, head = row["base"], row["head"]
        lines.append(f"### {task}")
        lines.append("")
        lines.append("| metric | base | head | Δ |")
        lines.append("|---|---|---|---|")
        for name in names:
            label = _METRIC_LABELS.get(name, name)
            lines.append(
                f"| {label} | {_fmt(base.metric(name)) if base else '—'} | "
                f"{_fmt(head.metric(name)) if head else '—'} | "
                f"{_delta(base.metric(name) if base else None, head.metric(name) if head else None)} |"
            )
        lines.append("")

    # --- Summary ---------------------------------------------------------
    base_metrics = [r["base"] for r in rows if r["base"]]
    head_metrics = [r["head"] for r in rows if r["head"]]
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- tasks in base: {len(base_metrics)}; in head: {len(head_metrics)}")
    lines.append(
        f"- tasks only in base: {sum(1 for r in rows if r['base'] and not r['head'])}; "
        f"only in head: {sum(1 for r in rows if r['head'] and not r['base'])}"
    )

    for name in names:
        base_values = [
            m.metric(name) for m in base_metrics if m.metric(name) is not None
        ]
        head_values = [
            m.metric(name) for m in head_metrics if m.metric(name) is not None
        ]
        if name.startswith("score."):
            b_mean = _mean(base_values)
            h_mean = _mean(head_values)
            lines.append(
                f"- {_METRIC_LABELS.get(name, name)}: mean "
                f"{_fmt(b_mean)} → {_fmt(h_mean)}"
            )
        elif name in ("cost_usd", "input_tokens", "cache_tokens", "output_tokens"):
            lines.append(
                f"- {_METRIC_LABELS.get(name, name)}: total "
                f"{_fmt(_totals(base_metrics, name))} → "
                f"{_fmt(_totals(head_metrics, name))}"
            )
        elif name in ("agent_duration_sec", "total_duration_sec"):
            b_mean = _mean(base_values)
            h_mean = _mean(head_values)
            lines.append(
                f"- {_METRIC_LABELS.get(name, name)}: mean "
                f"{_fmt(b_mean)} → {_fmt(h_mean)}"
            )
    pass_delta = (
        f"{sum(1 for m in base_metrics if m.passed)}/{len(base_metrics)} → "
        f"{sum(1 for m in head_metrics if m.passed)}/{len(head_metrics)}"
    )
    lines.append(f"- passed trials: {pass_delta}")
    lines.append("")

    return "\n".join(lines)
