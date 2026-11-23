"""Copilot usage read from a trial's collected agent artifacts.

Harbor's ``copilot-cli`` agent runs the CLI with ``--usage-output-file`` and
collects the resulting ``copilot-usage.json`` next to the JSONL event stream,
so a trial's authoritative token, request, and cost totals are already on disk
when it finishes. The snapshot is session-cumulative and keyed by model::

    {"sessionStartTime": ..., "aiCreditsStatus": "ok",
     "totalPremiumRequestCost": 3,
     "modelMetrics": {"gpt-6-luna": {"requests": {"count": 2, "cost": 2},
                                     "usage": {"inputTokens": ..., ...},
                                     "totalNanoAiu": 724569000}}}

This module aggregates those per-model entries into the usage metrics the
report reads. On a resumed session the snapshot still covers the earlier
segment: Harbor moves the pre-resume snapshot to
``copilot-usage-baseline.json`` before the CLI writes a new one, so the trial's
``copilot-usage.json`` carries both segments' requests and tokens. The reader
subtracts that baseline when it belongs to the same session (same
``sessionStartTime``), so a resumed trial reports only the usage it added.

The JSONL stream is the fallback for a trial whose usage file is missing (an
interrupted run): it carries output tokens and a cost checkpoint but no
input/cache counts.

``inputTokens`` includes cached tokens (matching AgentContext's "input
including cache"). Copilot meters cost in nano-AIU: one AI credit is 1e9
nano-AIU and costs $0.01, so a nano-AIU is ``$0.01 / 1e9``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

#: The Copilot artifacts, relative to an agent log dir. The same names hold
#: whether the log dir is a container's ``/logs/agent`` or a trial's ``agent/``.
COPILOT_USAGE_REL = "copilot-usage.json"
#: Harbor moves the pre-resume snapshot here, so a resumed trial's log dir
#: holds both the session's cumulative usage and the segment already reported.
COPILOT_USAGE_BASELINE_REL = "copilot-usage-baseline.json"
COPILOT_CLI_JSONL_REL = "copilot-cli.jsonl"

NANO_AIU_PER_AI_CREDIT = 1_000_000_000
USD_PER_AI_CREDIT = 0.01

#: Statuses under which the CLI's metering is not a complete price.
_UNPRICED_AI_CREDITS_STATUSES = frozenset({"partial", "unavailable"})

#: The snapshot's ``usage`` fields: on-disk name and aggregated field name.
_USAGE_FIELDS = (
    ("inputTokens", "input_tokens"),
    ("cacheReadTokens", "cache_read_tokens"),
    ("cacheWriteTokens", "cache_write_tokens"),
    ("outputTokens", "output_tokens"),
    ("reasoningTokens", "reasoning_tokens"),
)


def _nano_aiu_to_usd(value: int | float) -> float:
    """Convert Copilot's nano-AIU metering value to USD."""
    return value / NANO_AIU_PER_AI_CREDIT * USD_PER_AI_CREDIT


@dataclass
class CopilotUsage:
    """Aggregated token/cost usage for one Copilot CLI session.

    Fields that are unknown stay ``None`` so callers can distinguish "absent"
    from a measured zero. ``n_requests`` is ``None`` when the artifact does not
    carry a request count; ``cost_usd`` is ``None`` when the metering reports no
    price (no nano-AIU recorded, or AI credits only partially priced).
    """

    input_tokens: int | None = None
    cache_read_tokens: int | None = None
    cache_write_tokens: int | None = None
    output_tokens: int | None = None
    reasoning_tokens: int | None = None
    n_requests: int | None = None
    cost_usd: float | None = None
    source: str | None = None

    @property
    def has_data(self) -> bool:
        """True when at least one token or cost metric was actually measured."""
        return any(
            value is not None
            for value in (
                self.input_tokens,
                self.cache_read_tokens,
                self.cache_write_tokens,
                self.output_tokens,
                self.reasoning_tokens,
                self.cost_usd,
            )
        )


def _read_json_snapshot(path: Path) -> dict[str, Any] | None:
    """The parsed usage snapshot, or ``None`` when unreadable or not an object."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def _model_usage(entry: dict[str, Any]) -> dict[str, int]:
    """One model's token counts, keyed by aggregated field name."""
    usage = entry.get("usage") or {}
    return {field: int(usage.get(alias) or 0) for alias, field in _USAGE_FIELDS}


def _entry_since(entry: dict[str, Any], baseline: dict[str, Any]) -> dict[str, Any]:
    """One model's metrics with ``baseline``'s contribution removed.

    Mirrors Harbor's own snapshot subtraction: token counts, request count, and
    the nano-AIU price are differences, while a price missing on either side
    stays missing so a partial price is never reported as a total. Every
    subtracted value is clamped at zero, because a baseline that exceeds the
    snapshot (an interrupted resume) cannot report negative usage.
    """
    current_usage = entry.get("usage") or {}
    base_usage = baseline.get("usage") or {}
    usage = {
        alias: max(
            0, int(current_usage.get(alias) or 0) - int(base_usage.get(alias) or 0)
        )
        for alias, _ in _USAGE_FIELDS
    }
    adjusted = {**entry, "usage": usage}

    current_requests = (entry.get("requests") or {}).get("count")
    if current_requests is not None:
        base_requests = (baseline.get("requests") or {}).get("count") or 0
        adjusted["requests"] = {
            **(entry.get("requests") or {}),
            "count": max(0, int(current_requests) - int(base_requests)),
        }

    current_nano_aiu = entry.get("totalNanoAiu")
    base_nano_aiu = baseline.get("totalNanoAiu")
    if current_nano_aiu is None or base_nano_aiu is None:
        adjusted.pop("totalNanoAiu", None)
    else:
        adjusted["totalNanoAiu"] = max(0, current_nano_aiu - base_nano_aiu)
    return adjusted


def _models_since(
    snapshot: dict[str, Any], baseline: dict[str, Any] | None
) -> dict[str, Any]:
    """The snapshot's ``modelMetrics`` net of a same-session ``baseline``.

    A baseline that is absent, or recorded for a different
    ``sessionStartTime`` (a resume that found no session to continue), is
    ignored: the snapshot is then reported unchanged, as Harbor's ``since``
    does. Models only the baseline knows about are dropped, since nothing in
    the current segment used them.
    """
    models = snapshot.get("modelMetrics") or {}
    if baseline is None:
        return models
    if baseline.get("sessionStartTime") != snapshot.get("sessionStartTime"):
        return models
    baseline_models = baseline.get("modelMetrics") or {}
    adjusted: dict[str, Any] = {}
    for name, entry in models.items():
        prior = baseline_models.get(name)
        if isinstance(entry, dict) and isinstance(prior, dict):
            entry = _entry_since(entry, prior)
        adjusted[name] = entry
    return adjusted


def _model_cost(entry: dict[str, Any]) -> float | None:
    """One model's cost, or ``None`` when the snapshot leaves it unpriced."""
    status = entry.get("aiCreditsStatus")
    if status in _UNPRICED_AI_CREDITS_STATUSES:
        return None
    total_nano_aiu = entry.get("totalNanoAiu")
    if total_nano_aiu is None:
        return None
    return _nano_aiu_to_usd(total_nano_aiu)


def extract_usage_from_usage_file(usage_path: Path) -> CopilotUsage | None:
    """Aggregate ``copilot-usage.json`` across every model it reports.

    When Harbor wrote a ``copilot-usage-baseline.json`` beside the snapshot for
    the same session, the baseline's contribution is subtracted first: the
    artifact is session-cumulative, so on a resumed trial it covers the earlier
    segment too. A missing, unreadable, or other-session baseline is ignored.

    Returns ``None`` when the file is missing, unreadable, or reports no model
    metrics. Token sums that are absent everywhere stay ``None``; the cost is
    ``None`` when any model's price is missing, so a partial price is never
    reported as a total.
    """
    if not usage_path.is_file():
        return None
    snapshot = _read_json_snapshot(usage_path)
    if snapshot is None:
        return None
    baseline = _read_json_snapshot(usage_path.with_name(COPILOT_USAGE_BASELINE_REL))
    models = _models_since(snapshot, baseline)
    if not models:
        return None

    totals = {"input_tokens": 0, "cache_read_tokens": 0, "cache_write_tokens": 0,
              "output_tokens": 0, "reasoning_tokens": 0}
    n_requests = 0
    saw_requests = False
    cost: float | None = 0.0
    unpriced = snapshot.get("aiCreditsStatus") in _UNPRICED_AI_CREDITS_STATUSES
    for entry in models.values():
        if not isinstance(entry, dict):
            continue
        for key, value in _model_usage(entry).items():
            totals[key] += value
        requests = (entry.get("requests") or {}).get("count")
        if requests is not None:
            n_requests += int(requests)
            saw_requests = True
        model_cost = None if unpriced else _model_cost(entry)
        cost = None if cost is None or model_cost is None else cost + model_cost

    return CopilotUsage(
        **{key: value or None for key, value in totals.items()},
        n_requests=n_requests if saw_requests else None,
        cost_usd=cost,
        source=COPILOT_USAGE_REL,
    )


def extract_usage_from_jsonl(jsonl_path: Path) -> CopilotUsage | None:
    """Derive usage from the raw Copilot CLI JSONL stream (fallback).

    Uses the ``session.usage_checkpoint`` event for the total cost
    (``totalNanoAiu``), sums ``outputTokens`` across ``assistant.message``
    events, and counts ``model.call_start`` events as model requests. Input and
    cache token counts are not present in this stream for GPT runs, so they stay
    ``None``.
    """
    if not jsonl_path.is_file():
        return None
    total_nano_aiu = 0
    output_tokens = 0
    n_requests = 0
    saw_usage = False
    try:
        text = jsonl_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        event_type = event.get("type")
        if event_type == "session.usage_checkpoint":
            data = event.get("data") or {}
            total_nano_aiu = data.get("totalNanoAiu") or total_nano_aiu
            saw_usage = True
        elif event_type == "assistant.message":
            data = event.get("data") or {}
            output_tokens += int(data.get("outputTokens") or 0)
            saw_usage = True
        elif event_type == "model.call_start":
            n_requests += 1
    if not saw_usage:
        return None
    return CopilotUsage(
        output_tokens=output_tokens or None,
        cost_usd=_nano_aiu_to_usd(total_nano_aiu) if total_nano_aiu else None,
        n_requests=n_requests,
        source=COPILOT_CLI_JSONL_REL,
    )


def copilot_artifact_paths(root: Path) -> tuple[Path, Path]:
    """The usage snapshot and JSONL stream under ``root`` (an agent log dir)."""
    return root / COPILOT_USAGE_REL, root / COPILOT_CLI_JSONL_REL


def extract_usage(usage_path: Path, jsonl_path: Path) -> CopilotUsage | None:
    """Best-effort usage across two artifacts: the usage snapshot, then JSONL.

    The one precedence decision shared by every consumer: the CLI's own usage
    snapshot is authoritative when it holds measured data; otherwise the raw
    JSONL stream is aggregated. Each caller passes its own artifact paths (the
    agent's logs layout and the report's job layout differ).
    """
    usage = extract_usage_from_usage_file(usage_path)
    if usage is not None and usage.has_data:
        return usage
    return extract_usage_from_jsonl(jsonl_path)
