"""Extract Copilot CLI usage metrics from a trial's saved session artifacts.

The Copilot CLI JSONL stream (``copilot-cli.jsonl``) reports token usage
differently per model family:

* Anthropic models emit a flat stream of ``usage`` events carrying both
  ``input_tokens`` and ``output_tokens``.
* OpenAI/GPT models emit the session-event stream: ``assistant.message``
  events carry only ``outputTokens`` — input/cache token counts and cost are
  absent from the stream.

Harbor's trajectory parser therefore leaves input/cache tokens and cost unset
for GPT runs. The authoritative source for those numbers is the Copilot CLI's
own session database (``copilot/session-store.db``): its
``assistant_usage_events`` table records one row per model request with input,
cache-read, cache-write, output and reasoning token counts plus a
``total_nano_aiu`` metering value that equals the request cost in nano-USD.
Harbor preserves that database next to the JSONL stream
(``_save_session_state``), so both are available post-run.

This module aggregates those per-request rows (with a JSONL fallback) into the
metrics Harbor's parser cannot produce on its own.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path

from harbor_bench.task_shape import COPILOT_CLI_JSONL_REL, COPILOT_SESSION_DB_REL


@dataclass
class CopilotUsage:
    """Aggregated token/cost usage for one Copilot CLI session.

    ``input_tokens`` includes cached tokens (matching the ``assistant_usage_events``
    semantics and AgentContext's "input including cache"). ``cost_usd`` is derived
    from ``total_nano_aiu``, Copilot's metering value equal to the request cost in
    nano-USD. Fields that are unknown stay ``None`` so callers can distinguish
    "absent" from a measured zero.
    """

    input_tokens: int | None = None
    cache_read_tokens: int | None = None
    cache_write_tokens: int | None = None
    output_tokens: int | None = None
    reasoning_tokens: int | None = None
    cost_usd: float | None = None
    n_requests: int = 0
    source: str | None = None
    extras: dict = field(default_factory=dict)

    @property
    def has_data(self) -> bool:
        """True when at least one metric was actually measured."""
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


def _connect_readonly(path: Path) -> sqlite3.Connection | None:
    """Open ``path`` read-only, falling back to a normal open.

    ``mode=ro`` is preferred but fails for WAL databases when the side-car
    ``-shm``/``-wal`` files are missing (it would need write access to recreate
    them); a plain read is then safe and equivalent for our aggregation.
    """
    try:
        return sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=2)
    except sqlite3.Error:
        try:
            return sqlite3.connect(str(path), timeout=2)
        except sqlite3.Error:
            return None


def extract_usage_from_session_db(db_path: Path) -> CopilotUsage | None:
    """Aggregate ``assistant_usage_events`` from a Copilot CLI session database.

    Returns ``None`` when the file is missing, not a valid SQLite database, or
    does not expose the usage table. Missing/``NULL`` metrics are summed as zero
    but reported back as ``None`` when nothing was measured.
    """
    if not db_path.is_file():
        return None
    con = _connect_readonly(db_path)
    if con is None:
        return None
    try:
        row = con.execute(
            """
            SELECT
                COALESCE(SUM(input_tokens), 0),
                COALESCE(SUM(cache_read_tokens), 0),
                COALESCE(SUM(cache_write_tokens), 0),
                COALESCE(SUM(output_tokens), 0),
                COALESCE(SUM(reasoning_tokens), 0),
                COALESCE(SUM(total_nano_aiu), 0),
                COUNT(*)
            FROM assistant_usage_events
            """
        ).fetchone()
    except sqlite3.Error:
        return None
    finally:
        con.close()

    if row is None or row[6] == 0:
        return None
    input_tokens, cache_read, cache_write, output, reasoning, nano_aiu, n = row
    return CopilotUsage(
        input_tokens=int(input_tokens) or None,
        cache_read_tokens=int(cache_read) or None,
        cache_write_tokens=int(cache_write) or None,
        output_tokens=int(output) or None,
        reasoning_tokens=int(reasoning) or None,
        cost_usd=(nano_aiu / 1e9) if nano_aiu else None,
        n_requests=int(n),
        source="session-store.db",
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
        cost_usd=(total_nano_aiu / 1e9) if total_nano_aiu else None,
        n_requests=n_requests,
        source="copilot-cli.jsonl",
    )


def copilot_artifact_paths(root: Path) -> tuple[Path, Path]:
    """The two Copilot artifact paths under ``root`` (session DB, JSONL).

    Both the agent (its ``logs_dir``) and a saved trial (its ``agent/`` dir)
    keep the Copilot CLI artifacts at the same two relative locations (the
    agent-log-dir coordinates declared in :mod:`harbor_bench.task_shape`);
    each caller passes its own root (the agent's logs layout and the trial
    layout differ).
    """
    return root / COPILOT_SESSION_DB_REL, root / COPILOT_CLI_JSONL_REL


def extract_usage(db_path: Path, jsonl_path: Path) -> CopilotUsage | None:
    """Best-effort usage across two artifact locations: session DB first, JSONL fallback.

    The one precedence decision shared by every consumer: the session database
    (``assistant_usage_events``) is authoritative when it holds measured data;
    otherwise the raw JSONL stream is aggregated. Each caller passes its own
    artifact paths (the agent's logs layout and the report's job layout differ).
    """
    usage = extract_usage_from_session_db(db_path)
    if usage is not None and usage.has_data:
        return usage
    return extract_usage_from_jsonl(jsonl_path)
