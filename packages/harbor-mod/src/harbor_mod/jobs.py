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

from harbor_mod.copilot_usage import CopilotUsage, copilot_artifact_paths, extract_usage
from harbor_mod.metrics import MetricSpec, derivable_specs

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
    fields mirror the reportable metrics. Values are read by the metric
    registry (:data:`harbor_mod.metrics.METRIC_SPECS`) through its
    :class:`~harbor_mod.metrics.MetricSpec` (a reward key or a field), never
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


@dataclass(frozen=True)
class TrialArtifacts:
    """Every artifact location of one trial directory, resolved from its root.

    The one owner of the trial-directory layout: ``result.json``, the ATIF
    trajectory, the verifier usage/reward files, and the Copilot session
    artifacts (session DB + JSONL stream). :class:`Trial` reads every file
    through this value, so the layout lives in exactly one place and
    :mod:`harbor_mod.copilot_usage` never sees a trial path (it aggregates
    whatever two files it is handed).
    """

    result: Path
    trajectory: Path
    verifier_usage: Path
    reward_details: Path
    copilot_session_db: Path
    copilot_cli_jsonl: Path

    @classmethod
    def for_trial(cls, trial_dir: Path) -> "TrialArtifacts":
        """Resolve the six artifact locations under one trial directory."""
        session_db, cli_jsonl = copilot_artifact_paths(trial_dir / "agent")
        return cls(
            result=trial_dir / "result.json",
            trajectory=trial_dir / "agent" / "trajectory.json",
            verifier_usage=trial_dir / "verifier" / "usage.jsonl",
            reward_details=trial_dir / "verifier" / "reward-details.json",
            copilot_session_db=session_db,
            copilot_cli_jsonl=cli_jsonl,
        )

    def usage(self) -> CopilotUsage | None:
        """Aggregated Copilot usage for this trial (session DB, JSONL fallback)."""
        return extract_usage(self.copilot_session_db, self.copilot_cli_jsonl)


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
        self._artifacts = TrialArtifacts.for_trial(path)
        self._facts: TrialFacts | None = None
        self._data_exc: Exception | None = None

    def _read_facts(self) -> TrialFacts:
        """Load every artifact of this trial once into a :class:`TrialFacts`.

        The per-artifact readers are the only places that know their files'
        shapes: ``result.json`` (a corrupt file is remembered as ``_data_exc``
        so ``metrics()`` can raise on demand), the Copilot session DB/JSONL
        usage, ``verifier/usage.jsonl``, ``verifier/reward-details.json``, and
        the ATIF trajectory. All artifact locations come from
        :attr:`_artifacts` (:class:`TrialArtifacts` owns the layout).
        """
        if self._facts is None:
            data = None
            try:
                data = json.loads(
                    self._artifacts.result.read_text(encoding="utf-8")
                )
            except (OSError, json.JSONDecodeError) as exc:
                self._data_exc = exc
            self._facts = TrialFacts(
                data=data,
                usage=self._artifacts.usage(),
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
        # One precedence rule per usage-backed metric, declared once in the
        # metric registry (result_key/usage_attr): the mod agent's persisted
        # value wins (top-level agent_result field, then metadata), and the
        # artifact backfill fills when the file cannot report the number.
        derived = {
            spec.key: _first(
                self._reported_value(agent_result, spec),
                self._usage_value(facts, spec.usage_attr),
            )
            for spec in derivable_specs()
        }
        return TrialMetrics(
            task_name=self.task_name,
            trial_name=data.get("trial_name"),
            rewards=dict(rewards),
            **derived,
            n_steps=_first(agent_result.get("n_steps"), facts.trajectory_steps),
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
        usage_file = self._artifacts.verifier_usage
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
        details = self._artifacts.reward_details
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
        path = self._artifacts.trajectory
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
    def _reported_value(agent_result: JSON, spec: MetricSpec) -> Any:
        """The value the mod agent persisted for ``spec``, or ``None``.

        The agent writes each usage-backed metric under its registry
        ``result_key``: as a top-level ``agent_result`` field where
        :class:`~harbor.models.agent.context.AgentContext` has the attribute
        (input/cache/output tokens, cost), otherwise under
        ``agent_result.metadata`` (request/reasoning counts). Reading the
        persisted value first is what makes the artifact backfill a true
        fallback for runs the mod agent did not produce.
        """
        value = agent_result.get(spec.result_key)
        if value is not None:
            return value
        return (agent_result.get("metadata") or {}).get(spec.result_key)

    @staticmethod
    def _usage_value(facts: TrialFacts, attr: str) -> Any:
        """One backfill value from the aggregated Copilot usage.

        ``attr`` is a :class:`CopilotUsage` attribute named by the metric
        registry's ``usage_attr``. ``n_requests`` reports a zero count as
        absent (matching the prior ``n_requests or None`` semantics); every
        other attribute passes through. Returns ``None`` when the trial
        recorded no usage.
        """
        usage = facts.usage
        if usage is None:
            return None
        value = getattr(usage, attr)
        if attr == "n_requests":
            return value or None
        return value


class Job:
    """A Harbor job directory: a set of trials (one subdirectory each).

    The deep seam for reading a job: the directory is read once into a cached
    ordered trial list, and :meth:`metrics` and :meth:`meta` are pure
    derivations from it — one parse of each ``result.json`` serves both.
    ``iter_trials`` is the internal seam the derivations (and the Trial tests)
    iterate through.
    """

    def __init__(self, path: Path) -> None:
        self.path = path
        self._trials: tuple[Trial, ...] | None = None

    def _read_trials(self) -> tuple[Trial, ...]:
        """Load the ordered trial list once; cached for later derivations.

        Each :class:`Trial` parses its own ``result.json`` lazily (cached on
        the trial), so :meth:`metrics` and :meth:`meta` sharing this list is
        what makes the whole job a single read.
        """
        if self._trials is None:
            self._trials = tuple(self.iter_trials())
        return self._trials

    def iter_trials(self) -> Iterator[Trial]:
        """Yield each trial subdirectory (sorted, deterministic)."""
        if not self.path.is_dir():
            return
        for entry in sorted(p for p in self.path.iterdir() if p.is_dir()):
            if (entry / "result.json").is_file():
                yield Trial(entry)

    def metrics(self) -> dict[str, TrialMetrics]:
        """Per-task metrics for this job, keyed by task name.

        With ``n_attempts > 1`` a task may appear more than once: the trial
        last in sorted directory order wins. Raises ``FileNotFoundError`` when
        the job directory does not exist; a corrupt ``result.json`` raises on
        first access (the report treats a broken trial as a hard failure).
        """
        if not self.path.is_dir():
            raise FileNotFoundError(f"job directory not found: {self.path}")
        out: dict[str, TrialMetrics] = {}
        for trial in self._read_trials():
            metrics = trial.metrics()
            out[metrics.task_name] = metrics
        return out

    def meta(self) -> JobMeta | None:
        """Job-level run configuration (models, effort, skill versions).

        The first trial that reports a field fills it. Best-effort: a corrupt
        ``result.json`` is skipped, and a missing job directory yields
        ``None``.
        """
        if not self.path.is_dir():
            return None
        meta = JobMeta()
        for trial in self._read_trials():
            trial_meta = trial.meta()
            if meta.agent_model is None:
                meta.agent_model = trial_meta.agent_model
            if meta.agent_effort is None:
                meta.agent_effort = trial_meta.agent_effort
            if not meta.skills:
                meta.skills = trial_meta.skills
            if meta.judge_model is None:
                meta.judge_model = trial_meta.judge_model
            if meta.judge_effort is None:
                meta.judge_effort = trial_meta.judge_effort
            if (
                meta.agent_model is not None
                and meta.agent_effort is not None
                and meta.judge_model is not None
                and meta.judge_effort is not None
                and meta.skills
            ):
                break
        return meta
