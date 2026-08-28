"""Read Harbor job directories: a job is a set of trials.

Each ``harbor run -c config.yaml`` writes its trials under ``jobs/<run>``: one
subdirectory per trial holding a ``result.json`` plus collected artifacts
(``agent/trajectory.json``, ``agent/copilot/session-store.db``,
``agent/copilot-cli.jsonl``, ``verifier/reward-details.json``,
``verifier/usage.jsonl``).

This module owns the trial-directory layout *and* the meaning of its files:
:class:`Trial` encapsulates one trial subdirectory, loads every artifact once
into a :class:`TrialFacts` value, and exposes typed accessors (``metrics()``,
``meta()``) that are pure derivations from it instead of the raw dict.
:class:`Job` iterates the trials of one job directory. ``compare`` turns what
this module reads into a delta report; nothing here knows about reporting.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
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


def _first(*values: Any) -> Any:
    """The first non-``None`` value, else ``None``."""
    for value in values:
        if value is not None:
            return value
    return None


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


@dataclass
class TrialMetrics:
    """Metrics extracted from one trial ``result.json``.

    ``rewards`` carries the verifier rewards keyed by criterion; the other
    fields mirror the reportable metrics. Values are read by the
    comparison-report metric registry through its
    :class:`~harbor_mod.compare.MetricSpec` (a reward key or a field), never
    through a ``score.``-prefixed string accessor here.
    """

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


@dataclass
class TrialFacts:
    """Raw facts read from one trial directory, from every artifact.

    One value the artifact readers populate: the parsed ``result.json``, the
    aggregated Copilot usage (session DB, JSONL fallback), the verifier token
    total (``verifier/usage.jsonl``), the judge's ``reward-details.json``, and
    the ATIF trajectory step count. :meth:`Trial.metrics` and :meth:`Trial.meta`
    are pure derivations from this value, so "which source wins" is decided
    exactly once here (a ``result.json`` value beats the artifact backfill).
    """

    data: JSON | None = None
    usage: CopilotUsage | None = None
    verifier_usage_total: int | None = None
    reward_details: JSON | None = None
    trajectory_steps: int | None = None


class Trial:
    """One trial subdirectory: ``result.json`` plus the collected artifacts.

    The trial-directory layout — where each artifact lives and how it is read —
    and the meaning of its ``result.json`` fields are both encapsulated here.
    :meth:`_read_facts` loads every artifact once into a :class:`TrialFacts`
    value; :meth:`metrics` and :meth:`meta` (plus :attr:`task_name`, the key
    the report joins on) are pure derivations from it. ``result.json`` is
    parsed lazily; a corrupt/unreadable file makes :meth:`metrics` raise on
    first access while :meth:`meta` tolerates it and yields an empty
    :class:`JobMeta`.
    """

    def __init__(self, path: Path) -> None:
        self.path = path
        self._facts: TrialFacts | None = None
        self._data_exc: Exception | None = None

    def _read_facts(self) -> TrialFacts:
        """Load every artifact of this trial once into a :class:`TrialFacts`.

        The per-artifact readers are the only places that know their files'
        shapes: ``result.json`` (a corrupt file is remembered as ``_data_exc``
        so ``metrics()`` can raise on demand), the Copilot session DB/JSONL
        usage, ``verifier/usage.jsonl``, ``verifier/reward-details.json``, and
        the ATIF trajectory.
        """
        if self._facts is None:
            data = None
            try:
                data = json.loads(
                    (self.path / "result.json").read_text(encoding="utf-8")
                )
            except (OSError, json.JSONDecodeError) as exc:
                self._data_exc = exc
            self._facts = TrialFacts(
                data=data,
                usage=extract_trial_usage(self.path),
                verifier_usage_total=self._verifier_usage_total(),
                reward_details=self._reward_details(),
                trajectory_steps=self._trajectory_steps(),
            )
        return self._facts

    @property
    def task_name(self) -> str:
        """The task this trial belongs to (``result.json`` ``task_name``)."""
        return (self._read_facts().data or {}).get("task_name") or self.path.name

    def metrics(self) -> TrialMetrics:
        """The typed metrics for this trial, derived from the trial facts.

        Reads the reward, token, cost, duration, and pass/fail numbers out of
        ``result.json`` and backfills the values the file cannot report (steps,
        GPT token/cost) from the trial's raw artifacts. Raises on a
        corrupt/unreadable ``result.json`` — the report treats a broken trial
        as a hard failure.
        """
        facts = self._read_facts()
        if facts.data is None:
            if self._data_exc is not None:
                raise self._data_exc
            raise RuntimeError(f"unreadable result.json: {self.path}")
        data = facts.data
        agent_result = data.get("agent_result") or {}
        rewards = (data.get("verifier_result") or {}).get("rewards") or {}
        agent_execution = data.get("agent_execution") or {}
        return TrialMetrics(
            task_name=self.task_name,
            trial_name=data.get("trial_name"),
            rewards=dict(rewards),
            input_tokens=_first(
                agent_result.get("n_input_tokens"),
                self._usage_value(facts, "input_tokens"),
            ),
            cache_tokens=_first(
                agent_result.get("n_cache_tokens"),
                self._usage_value(facts, "cache_tokens"),
            ),
            output_tokens=_first(
                agent_result.get("n_output_tokens"),
                self._usage_value(facts, "output_tokens"),
            ),
            reasoning_tokens=_first(
                agent_result.get("n_reasoning_tokens"),
                self._usage_value(facts, "reasoning_tokens"),
            ),
            n_requests=_first(
                agent_result.get("n_requests"), self._usage_value(facts, "n_requests")
            ),
            n_steps=_first(agent_result.get("n_steps"), facts.trajectory_steps),
            cost_usd=_first(
                agent_result.get("cost_usd"), self._usage_value(facts, "cost_usd")
            ),
            verifier_tokens=self._verifier_tokens(facts),
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

    def meta(self) -> JobMeta:
        """Run-configuration facts readable from this trial (models, skills).

        Best-effort: a corrupt/unreadable ``result.json`` yields an empty
        :class:`JobMeta` instead of raising, so the job-level reader can skip
        bad trials and keep filling fields from the next one.
        """
        facts = self._read_facts()
        meta = JobMeta()
        data = facts.data
        if data is None:
            return meta
        agent = (data.get("config") or {}).get("agent") or {}
        meta.agent_model = agent.get("model_name") or (
            (data.get("agent_info") or {}).get("model_info") or {}
        ).get("name")
        meta.agent_effort = (agent.get("kwargs") or {}).get("reasoning_effort")
        meta.skills = [_describe_skill(path) for path in agent.get("skills") or []]
        self._load_judge_meta(meta, facts.reward_details)
        return meta

    def _load_judge_meta(self, meta: JobMeta, reward: JSON | None) -> None:
        """Fill judge model/effort from the trial's reward-details.json."""
        if reward is None:
            return
        judge = reward.get("judge") or {}
        meta.judge_model = judge.get("model")
        meta.judge_effort = judge.get("reasoning_effort")

    def _verifier_usage_total(self) -> int | None:
        """Total verifier (judge) tokens from ``verifier/usage.jsonl``.

        One line per judge LLM call, written by the ``test.sh`` LiteLLM shim
        (see the ``tests/test.sh`` template). ``None`` when the file is missing
        or recorded no usage; the reward-details fallback is applied by
        :meth:`_verifier_tokens`.
        """
        usage_file = self.path / "verifier" / "usage.jsonl"
        if not usage_file.is_file():
            return None
        total = 0
        saw = False
        try:
            lines = usage_file.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            return None
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
        return total if saw else None

    def _reward_details(self) -> JSON | None:
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

    def _trajectory_steps(self) -> int | None:
        """Read ``final_metrics.total_steps`` from the ATIF trajectory file."""
        path = self.path / "agent" / "trajectory.json"
        if not path.is_file():
            return None
        try:
            trajectory = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        return (trajectory.get("final_metrics") or {}).get("total_steps")

    def _verifier_tokens(self, facts: TrialFacts) -> int | None:
        """Total verifier (judge) tokens for the trial.

        Prefers ``facts.verifier_usage_total`` (``verifier/usage.jsonl``);
        falls back to ``reward.usage`` in ``reward-details.json`` (normalized
        ``JudgeUsage`` persisted by agent-mode judges or future rewardkit
        versions). Returns ``None`` when no usage was recorded.
        """
        if facts.verifier_usage_total is not None:
            return facts.verifier_usage_total
        reward = facts.reward_details
        if reward is None:
            return None
        usage = reward.get("usage")
        if not isinstance(usage, dict):
            return None
        total = (usage.get("input_tokens") or 0) + (usage.get("output_tokens") or 0)
        return int(total) if total else None

    @staticmethod
    def _usage_value(facts: TrialFacts, field: str) -> Any:
        """One backfill value from the aggregated Copilot usage.

        ``n_requests`` reports a zero count as absent (matching the prior
        ``n_requests or None`` semantics); every other field passes through.
        Returns ``None`` when the trial recorded no usage.
        """
        usage = facts.usage
        if usage is None:
            return None
        value = getattr(usage, field)
        if field == "n_requests":
            return value or None
        return value


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
