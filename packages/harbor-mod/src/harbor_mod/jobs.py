"""Read Harbor job directories: a job is a set of trials.

Each ``harbor run -c config.yaml`` writes its trials under ``jobs/<run>``: one
subdirectory per trial holding a ``result.json`` plus collected artifacts
(``agent/trajectory.json``, ``agent/copilot/session-store.db``,
``agent/copilot-cli.jsonl``, ``verifier/reward-details.json``,
``verifier/usage.jsonl``).

This module owns that trial-directory layout. :class:`Trial` encapsulates one
trial subdirectory and lazily reads its files; :class:`Job` iterates the
trials of one job directory. ``compare`` turns what this module reads into a
delta report; nothing here knows about reporting.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterator

from harbor_mod.copilot_usage import CopilotUsage, extract_trial_usage

JSON = dict[str, Any]


def _normalize_usage(usage: dict[str, Any]) -> tuple[int, int]:
    """Extract (input, output) token counts from a LiteLLM usage dict."""
    inp = usage.get("input_tokens") or usage.get("prompt_tokens") or 0
    out = usage.get("output_tokens") or usage.get("completion_tokens") or 0
    try:
        return int(inp), int(out)
    except (TypeError, ValueError):
        return 0, 0


class Trial:
    """One trial subdirectory: ``result.json`` plus the collected artifacts.

    The trial-directory layout is encapsulated here — where each artifact
    lives and how it is read — so a scan of a job reads each trial once and no
    other module needs to know the layout. ``result.json`` is parsed lazily
    and cached; a corrupt/unreadable file raises on first access, exactly as a
    direct read would.
    """

    def __init__(self, path: Path) -> None:
        self.path = path
        self._data: JSON | None = None
        self._data_loaded = False

    @property
    def data(self) -> JSON:
        """Parsed ``result.json`` (lazily read and cached)."""
        if not self._data_loaded:
            self._data = json.loads(
                (self.path / "result.json").read_text(encoding="utf-8")
            )
            self._data_loaded = True
        return self._data

    @property
    def task_name(self) -> str:
        """The task this trial belongs to (``result.json`` ``task_name``)."""
        return (self.data or {}).get("task_name") or self.path.name

    def reward_details(self) -> JSON | None:
        """The ``reward`` dict from ``verifier/reward-details.json``, or ``None``.

        Both verifier-token counts and the judge model/effort metadata are read
        from this one file; this method is the only place that knows its shape.
        """
        details = self.path / "verifier" / "reward-details.json"
        if not details.is_file():
            return None
        try:
            reward = (
                (json.loads(details.read_text(encoding="utf-8")) or {}).get("reward") or {}
            )
        except (OSError, json.JSONDecodeError):
            return None
        return reward

    def verifier_tokens(self) -> int | None:
        """Total verifier (judge) tokens for the trial.

        Prefers ``verifier/usage.jsonl`` — one line per judge LLM call, written
        by the ``test.sh`` LiteLLM shim (see the ``tests/test.sh`` template).
        Falls back to ``reward.usage`` in ``reward-details.json`` (normalized
        ``JudgeUsage`` persisted by agent-mode judges or future rewardkit
        versions). Returns ``None`` when no usage was recorded.
        """
        usage_file = self.path / "verifier" / "usage.jsonl"
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

        reward = self.reward_details()
        if reward is None:
            return None
        usage = reward.get("usage")
        if not isinstance(usage, dict):
            return None
        total = (usage.get("input_tokens") or 0) + (usage.get("output_tokens") or 0)
        return int(total) if total else None

    def trajectory_steps(self) -> int | None:
        """Read ``final_metrics.total_steps`` from the ATIF trajectory file."""
        path = self.path / "agent" / "trajectory.json"
        if not path.is_file():
            return None
        try:
            trajectory = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        return (trajectory.get("final_metrics") or {}).get("total_steps")

    def usage(self) -> CopilotUsage | None:
        """Aggregated token/cost usage from the trial artifacts (DB, then JSONL)."""
        return extract_trial_usage(self.path)


class Job:
    """A Harbor job directory: a set of trials (one subdirectory each).

    Iterating yields a :class:`Trial` per subdirectory that holds a
    ``result.json``, in sorted order. ``result.json`` is parsed once per trial
    (cached on the :class:`Trial`), so both the trial metrics and the job-level
    metadata can be derived from a single pass over the directory.
    """

    def __init__(self, path: Path) -> None:
        self.path = path

    def iter_trials(self) -> Iterator[Trial]:
        """Yield each trial subdirectory (sorted, deterministic)."""
        if not self.path.is_dir():
            return
        for entry in sorted(p for p in self.path.iterdir() if p.is_dir()):
            if (entry / "result.json").is_file():
                yield Trial(entry)
