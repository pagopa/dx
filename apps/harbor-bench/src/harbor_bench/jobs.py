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
:class:`Job` iterates completed and interrupted trials of one job directory.
``diff`` turns what this module reads into a delta report; nothing here knows
about reporting.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator, Literal

from harbor_copilot.copilot_usage import CopilotUsage, copilot_artifact_paths, extract_usage
from harbor_copilot.metrics import MetricSpec, derivable_specs, validate_metric_specs
from harbor_bench.task_shape import (
    RESULT_JSON,
    REWARD_DETAILS_JSON,
    SCORING_JSON,
    TRAJECTORY_JSON,
    VERIFIER_USAGE_JSONL,
    trial_relative,
)

JSON = dict[str, Any]
TrialStatus = Literal["completed", "error", "incomplete"]


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


def _task_name_from_trial_dir(path: Path) -> str:
    """Remove Harbor's ``__<attempt-id>`` suffix from a trial directory."""
    task_name, separator, attempt_id = path.name.rpartition("__")
    return task_name if separator and task_name and attempt_id else path.name


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


@dataclass(frozen=True)
class CriterionResult:
    """One verifier criterion outcome from ``verifier/reward-details.json``.

    RewardKit records one entry per judged criterion: ``name`` is its stable
    slug, ``description`` the full criterion text, ``value`` the 1.0/0.0
    outcome, and ``reasoning`` the judge's justification. The comparison
    report joins these across two trials to surface criterion-level changes
    the aggregate score hides.
    """

    name: str
    description: str = ""
    value: float | None = None
    weight: float = 1.0
    reasoning: str = ""

    @property
    def passed(self) -> bool | None:
        """Whether the judge marked this criterion passed, or ``None``.

        RewardKit's criterion values are 1.0 (passed) and 0.0 (failed); the
        ``value > 0`` rule lives here, next to the value it interprets.
        """
        if self.value is None:
            return None
        return self.value > 0.0


@dataclass(frozen=True)
class ScoringGate:
    """The verifier's ``[scoring]`` block, when the verifier recorded it.

    RewardKit 0.2.0 does not persist its scoring config; the generated
    ``test.sh`` copies ``quality.toml``'s ``[scoring]`` into
    ``verifier/scoring.json``, which Harbor collects with the rest of the
    verifier directory. Old runs have no file and read as ``None``.
    """

    aggregation: str | None = None
    threshold: float | None = None


@dataclass
class TrialMetrics:
    """Metrics extracted from one trial ``result.json``.

    ``rewards`` carries the verifier rewards keyed by criterion; ``criteria``
    and ``scoring`` carry the verifier's per-criterion detail and gate when
    the run recorded them; ``completed`` is the trial-level flag (finished
    without an exception) and :meth:`gate_passed` is the verifier's gate
    (RewardKit writes the already-gated reward; the recorded ``scoring.json``
    gate is display-only); ``status`` distinguishes completed, errored, and
    interrupted trials; the other fields mirror the reportable metrics. Values
    are read by the metric registry (:data:`harbor_bench.metrics.METRIC_SPECS`)
    through its :class:`~harbor_bench.metrics.MetricSpec` (a reward key or a
    field), never through a ``score.``-prefixed string accessor here.
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
    completed: bool = True
    trial_name: str | None = None
    status: TrialStatus = "completed"
    criteria: tuple[CriterionResult, ...] = ()
    scoring: ScoringGate | None = None

    def eval_passed(self, primary: MetricSpec | None) -> bool | None:
        """Whether the verifier's gate passed for this trial, or ``None``.

        RewardKit applies the task's ``[scoring]`` gate (usually ``threshold``)
        before writing the reward: 0.0 fails, >0 passes. ``None`` means no
        primary score was recorded.
        """
        if primary is None:
            return None
        value = primary.read(self)
        if value is None:
            return None
        return float(value) > 0.0

    def gate_passed(self, primary: MetricSpec | None) -> bool:
        """Gate pass, falling back to :attr:`completed` when no reward exists."""
        value = self.eval_passed(primary)
        return self.completed if value is None else value


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
    scoring: ScoringGate | None = None
    trajectory_steps: int | None = None


@dataclass(frozen=True)
class TrialArtifacts:
    """Every artifact location of one trial directory, resolved from its root.

    The one owner of the trial-directory layout: ``result.json``, the ATIF
    trajectory, the verifier usage/reward files, and the Copilot session
    artifacts (session DB + JSONL stream). :class:`Trial` reads every file
    through this value, so the layout lives in exactly one place and
    :mod:`harbor_bench.copilot_usage` never sees a trial path (it aggregates
    whatever two files it is handed).
    """

    result: Path
    trajectory: Path
    verifier_usage: Path
    reward_details: Path
    scoring: Path
    copilot_session_db: Path
    copilot_cli_jsonl: Path

    @classmethod
    def for_trial(cls, trial_dir: Path) -> "TrialArtifacts":
        """Resolve the seven artifact locations under one trial directory.

        The reader-side layout is derived from the container artifact paths
        declared in :mod:`harbor_bench.task_shape` (Harbor drops the ``/logs``
        prefix when re-materializing collected artifacts), so the writer's
        ``task.toml`` ``[artifacts]`` and this reader can never drift apart.
        """
        session_db, cli_jsonl = copilot_artifact_paths(trial_dir / "agent")
        return cls(
            result=trial_dir / RESULT_JSON,
            trajectory=trial_dir / trial_relative(TRAJECTORY_JSON),
            verifier_usage=trial_dir / trial_relative(VERIFIER_USAGE_JSONL),
            reward_details=trial_dir / trial_relative(REWARD_DETAILS_JSON),
            scoring=trial_dir / trial_relative(SCORING_JSON),
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
    parsed lazily. A missing file represents an interrupted trial and produces
    incomplete metrics; a corrupt or otherwise unreadable file makes
    :meth:`metrics` raise on first access while :meth:`meta` tolerates it and
    yields an empty :class:`JobMeta`.
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
        usage, ``verifier/usage.jsonl``, ``verifier/reward-details.json``,
        ``verifier/scoring.json``, and the ATIF trajectory. All artifact
        locations come from :attr:`_artifacts` (:class:`TrialArtifacts` owns
        the layout).
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
                scoring=self._scoring(),
                trajectory_steps=self._trajectory_steps(),
            )
        return self._facts

    @property
    def task_name(self) -> str:
        """The task this trial belongs to (``result.json`` ``task_name``)."""
        return (self._read_facts().data or {}).get(
            "task_name"
        ) or _task_name_from_trial_dir(self.path)

    def metrics(self) -> TrialMetrics:
        """The typed metrics for this trial, derived from the trial facts.

        Reads the reward, token, cost, duration, and completion flag out of
        ``result.json`` and backfills the values the file cannot report (steps,
        GPT token/cost) from the trial's raw artifacts. A missing
        ``result.json`` produces an incomplete result with any available
        artifact metrics. Corrupt or otherwise unreadable files raise — the
        report treats those as hard failures.
        """
        facts = self._read_facts()
        if facts.data is None:
            if isinstance(self._data_exc, FileNotFoundError):
                return TrialMetrics(
                    task_name=self.task_name,
                    trial_name=self.path.name,
                    rewards={},
                    **{
                        spec.key: self._usage_value(facts, spec.usage_attr)
                        for spec in derivable_specs()
                    },
                    n_steps=facts.trajectory_steps,
                    verifier_tokens=self._verifier_tokens(facts),
                    completed=False,
                    status="incomplete",
                    criteria=self._criteria(facts.reward_details),
                    scoring=facts.scoring,
                )
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
            completed=data.get("exception_info") is None,
            status="error" if data.get("exception_info") is not None else "completed",
            criteria=self._criteria(facts.reward_details),
            scoring=facts.scoring,
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

    def _scoring(self) -> ScoringGate | None:
        """The verifier's ``[scoring]`` gate from ``verifier/scoring.json``.

        The generated ``test.sh`` records the task's ``quality.toml`` scoring
        block here; old runs (or a verifier that never wrote it) yield ``None``.
        """
        path = self._artifacts.scoring
        if not path.is_file():
            return None
        try:
            raw = json.loads(path.read_text(encoding="utf-8")) or {}
        except (OSError, json.JSONDecodeError):
            return None
        aggregation = raw.get("aggregation")
        threshold = raw.get("threshold")
        return ScoringGate(
            aggregation=str(aggregation) if aggregation is not None else None,
            threshold=float(threshold)
            if isinstance(threshold, (int, float)) and not isinstance(threshold, bool)
            else None,
        )

    @staticmethod
    def _criteria(reward: JSON | None) -> tuple[CriterionResult, ...]:
        """Criterion outcomes recorded by RewardKit, or ``()`` when absent.

        RewardKit writes one ``criteria`` entry per judged criterion in the
        reward details; a malformed entry is skipped rather than failing the
        whole report.
        """
        if not reward:
            return ()
        raw = reward.get("criteria")
        if not isinstance(raw, list):
            return ()
        results: list[CriterionResult] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            name = item.get("name")
            if not isinstance(name, str) or not name:
                continue
            value = item.get("value")
            weight = item.get("weight")
            results.append(
                CriterionResult(
                    name=name,
                    description=str(item.get("description") or ""),
                    value=float(value)
                    if isinstance(value, (int, float)) and not isinstance(value, bool)
                    else None,
                    weight=float(weight)
                    if isinstance(weight, (int, float)) and not isinstance(weight, bool)
                    else 1.0,
                    reasoning=str(item.get("reasoning") or ""),
                )
            )
        return tuple(results)

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
        the trial), or records that Harbor stopped after creating
        ``trial.log``. Sharing this list between :meth:`metrics` and
        :meth:`meta` makes the whole job a single read.
        """
        if self._trials is None:
            self._trials = tuple(self.iter_trials())
        return self._trials

    def iter_trials(self) -> Iterator[Trial]:
        """Yield completed and interrupted trial directories deterministically."""
        if not self.path.is_dir():
            return
        for entry in sorted(p for p in self.path.iterdir() if p.is_dir()):
            if (entry / RESULT_JSON).is_file() or (entry / "trial.log").is_file():
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


#: The reader is a consumer of the metric registry: fail at import when a
#: registry key or usage attribute no longer names a real dataclass field,
#: instead of a ``TypeError`` or a silent ``None`` when a live trial is read.
validate_metric_specs(
    trial_metric_fields=set(TrialMetrics.__dataclass_fields__),
    copilot_usage_fields=set(CopilotUsage.__dataclass_fields__),
)
