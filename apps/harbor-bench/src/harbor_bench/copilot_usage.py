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
report reads. The JSONL stream is the fallback for a trial whose usage file is
missing (an interrupted run): it carries output tokens and a cost checkpoint
but no input/cache counts.

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
COPILOT_CLI_JSONL_REL = "copilot-cli.jsonl"

NANO_AIU_PER_AI_CREDIT = 1_000_000_000
USD_PER_AI_CREDIT = 0.01

#: Statuses under which the CLI's metering is not a complete price.
_UNPRICED_AI_CREDITS_STATUSES = frozenset({"partial", "unavailable"})


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
    """One model's token counts, keyed by snapshot field name."""
    usage = entry.get("usage") or {}
    return {
        "input_tokens": int(usage.get("inputTokens") or 0),
        "cache_read_tokens": int(usage.get("cacheReadTokens") or 0),
        "cache_write_tokens": int(usage.get("cacheWriteTokens") or 0),
        "output_tokens": int(usage.get("outputTokens") or 0),
        "reasoning_tokens": int(usage.get("reasoningTokens") or 0),
    }


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
    models = snapshot.get("modelMetrics") or {}
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
