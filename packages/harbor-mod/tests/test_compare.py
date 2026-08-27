"""Tests for the two-job comparison report (harbor-mod compare)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from harbor_mod.compare import build_report, load_job, load_job_meta, render_markdown

from tests.conftest import DEFAULT_USAGE_ROW, write_copilot_jsonl, write_session_db

AGENT_TIMES = ("2026-08-27T10:00:00+00:00", "2026-08-27T10:05:00+00:00")
TOTAL_TIMES = ("2026-08-27T10:00:00+00:00", "2026-08-27T10:07:00+00:00")


def _write_trial(
    job_dir: Path,
    task: str,
    *,
    rewards: dict[str, float | int] | None = None,
    tokens: tuple[int, int, int] | None = None,
    cost: float | None = None,
    exception: bool = False,
    verifier: tuple[str, str] | None = None,
) -> None:
    trial = job_dir / task
    trial.mkdir(parents=True, exist_ok=True)
    agent_result = {
        "n_input_tokens": tokens[0] if tokens else None,
        "n_cache_tokens": tokens[1] if tokens else None,
        "n_output_tokens": tokens[2] if tokens else None,
        "cost_usd": cost,
    }
    data = {
        "task_name": task,
        "trial_name": f"{task}__abc1234",
        "agent_result": agent_result,
        "verifier_result": {"rewards": rewards or {}},
        "agent_execution": {
            "started_at": AGENT_TIMES[0],
            "finished_at": AGENT_TIMES[1],
        },
        "started_at": TOTAL_TIMES[0],
        "finished_at": TOTAL_TIMES[1],
    }
    if verifier is not None:
        data["verifier"] = {"started_at": verifier[0], "finished_at": verifier[1]}
    if exception:
        data["exception_info"] = {
            "exception_type": "TimeoutError",
            "exception_message": "boom",
        }
    (trial / "result.json").write_text(json.dumps(data))


def _make_job(tmp_path: Path, name: str) -> Path:
    job = tmp_path / name
    job.mkdir(parents=True, exist_ok=True)
    return job


def test_load_job_parses_metrics(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(
        job,
        "skill-task-1",
        rewards={"quality": 0.9, "pass": 1},
        tokens=(1000, 200, 300),
        cost=0.05,
    )
    metrics = load_job(job)
    assert list(metrics) == ["skill-task-1"]
    m = metrics["skill-task-1"]
    assert m.rewards == {"quality": 0.9, "pass": 1}
    assert m.input_tokens == 1000
    assert m.cache_tokens == 200
    assert m.output_tokens == 300
    assert m.cost_usd == 0.05
    assert m.agent_duration_sec == 300.0
    assert m.total_duration_sec == 420.0
    assert m.passed is True


def test_load_job_marks_exception_as_failed(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "skill-task-1", exception=True)
    assert load_job(job)["skill-task-1"].passed is False


def test_load_job_missing_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_job(tmp_path / "nope")


def test_build_report_joins_by_task_and_computes_delta(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8}, tokens=(1000, 0, 100))
    _write_trial(head, "task-a", rewards={"quality": 0.95}, tokens=(1100, 50, 120))
    _write_trial(head, "task-only-head", rewards={"quality": 0.5})

    report = build_report(load_job(base), load_job(head))
    rows = {r["task"]: r for r in report["rows"]}
    assert set(rows) == {"task-a", "task-only-head"}
    assert rows["task-a"]["base"] is not None and rows["task-a"]["head"] is not None
    assert rows["task-only-head"]["base"] is None
    assert rows["task-only-head"]["head"] is not None


def test_render_markdown_includes_deltas(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", rewards={"quality": 0.8}, tokens=(1000, 0, 100))
    _write_trial(head, "task-a", rewards={"quality": 0.95}, tokens=(1100, 50, 120))

    md = render_markdown("run-base", "run-head", build_report(load_job(base), load_job(head)))
    assert "# Skill comparison: `run-base` → `run-head`" in md
    assert "### task-a" in md
    assert "score.quality" in md
    assert "input tokens" in md
    assert "0.95" in md  # head quality value
    assert "+0.150" in md or "+0.15" in md  # quality delta
    assert "+100" in md  # input token delta
    assert "passed trials" in md


def _write_artifacts(
    trial: Path,
    *,
    session_db_rows: list[tuple] | None = None,
    jsonl_output_tokens: list[int] | None = None,
    jsonl_nano_aiu: int = 1_665_217_000,
    steps: int | None = None,
) -> None:
    """Write raw trial artifacts that load_job can backfill from."""
    trial.mkdir(parents=True, exist_ok=True)
    if session_db_rows is not None:
        write_session_db(trial / "agent" / "copilot" / "session-store.db", rows=session_db_rows)
    if jsonl_output_tokens is not None:
        write_copilot_jsonl(
            trial / "agent" / "copilot-cli.jsonl",
            output_tokens=jsonl_output_tokens,
            total_nano_aiu=jsonl_nano_aiu,
        )
    if steps is not None:
        traj = trial / "agent" / "trajectory.json"
        traj.parent.mkdir(parents=True, exist_ok=True)
        traj.write_text(
            json.dumps({"final_metrics": {"total_steps": steps}}), encoding="utf-8"
        )


def test_load_job_backfills_missing_tokens_from_session_db(tmp_path):
    """GPT runs leave input/cache/cost unset; the session DB fills them."""
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", tokens=(None, None, 4870), cost=None)
    _write_artifacts(
        job / "task-a",
        session_db_rows=[DEFAULT_USAGE_ROW, (35_190, 31_087, 4_100, 359, 290, 207_814_000)],
    )
    m = load_job(job)["task-a"]
    assert m.input_tokens == 55_664
    assert m.cache_tokens == 31_087
    assert m.output_tokens == 4870  # already reported, left untouched
    assert m.cost_usd == 0.724569
    assert m.n_requests == 2
    assert m.reasoning_tokens == 310


def test_load_job_falls_back_to_jsonl_without_session_db(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", tokens=(None, None, None), cost=None)
    _write_artifacts(job / "task-a", jsonl_output_tokens=[41, 196], jsonl_nano_aiu=1_665_217_000)
    m = load_job(job)["task-a"]
    assert m.output_tokens == 237
    assert m.cost_usd == 1.665217
    assert m.input_tokens is None  # not present in the JSONL stream


def test_load_job_reads_steps_from_trajectory(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", tokens=(1000, 200, 300), cost=0.05)
    _write_artifacts(job / "task-a", steps=7)
    m = load_job(job)["task-a"]
    assert m.n_steps == 7


def test_render_markdown_includes_usage_metrics(tmp_path):
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a", tokens=(None, None, 237), cost=None)
    _write_artifacts(base / "task-a", jsonl_output_tokens=[41, 196], steps=7)
    _write_trial(head, "task-a", tokens=(55664, 31087, 4870), cost=0.724569)
    _write_artifacts(head / "task-a", steps=9)

    md = render_markdown("run-base", "run-head", build_report(load_job(base), load_job(head)))
    assert "reasoning tokens" in md
    assert "model requests" in md
    assert "steps" in md
    assert "1.67" in md  # jsonl-derived cost in the base row ($1.665217 rounded)
    assert "+2" in md  # steps delta (9 - 7)


VERIFIER_TIMES = ("2026-08-27T10:05:00+00:00", "2026-08-27T10:06:30+00:00")


def test_load_job_parses_verifier_duration_and_tokens(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", verifier=VERIFIER_TIMES)
    vdir = job / "task-a" / "verifier"
    vdir.mkdir(parents=True, exist_ok=True)
    # Two judge calls recorded by the test.sh LiteLLM shim (mixed key styles).
    (vdir / "usage.jsonl").write_text(
        json.dumps({"usage": {"input_tokens": 1200, "output_tokens": 80}})
        + "\n"
        + json.dumps({"usage": {"prompt_tokens": 300, "completion_tokens": 20}})
        + "\n"
    )
    m = load_job(job)["task-a"]
    assert m.verifier_duration_sec == 90.0
    assert m.verifier_tokens == 1600  # (1200 + 80) + (300 + 20)


def test_load_job_verifier_tokens_from_reward_details(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a")
    vdir = job / "task-a" / "verifier"
    vdir.mkdir(parents=True, exist_ok=True)
    (vdir / "reward-details.json").write_text(
        json.dumps({"reward": {"usage": {"input_tokens": 1000, "output_tokens": 200}}})
    )
    assert load_job(job)["task-a"].verifier_tokens == 1200


def test_load_job_verifier_tokens_none_without_usage(tmp_path):
    job = _make_job(tmp_path, "run-a")
    _write_trial(job, "task-a", verifier=VERIFIER_TIMES)
    assert load_job(job)["task-a"].verifier_tokens is None


def _write_meta_trial(
    job_dir: Path,
    task: str,
    *,
    agent_model: str | None,
    agent_effort: str | None,
    skills: list[str],
    judge_model: str | None = None,
    judge_effort: str | None = None,
) -> None:
    trial = job_dir / task
    trial.mkdir(parents=True, exist_ok=True)
    data = {
        "task_name": task,
        "trial_name": f"{task}__abc1234",
        "config": {
            "agent": {
                "model_name": agent_model,
                "kwargs": {"reasoning_effort": agent_effort} if agent_effort else {},
                "skills": skills,
            }
        },
        "agent_info": {"model_info": {"name": agent_model}},
        "verifier_result": {"rewards": {}},
    }
    (trial / "result.json").write_text(json.dumps(data))
    if judge_model:
        vdir = trial / "verifier"
        vdir.mkdir(parents=True, exist_ok=True)
        (vdir / "reward-details.json").write_text(
            json.dumps(
                {
                    "reward": {
                        "judge": {"model": judge_model, "reasoning_effort": judge_effort}
                    }
                }
            )
        )


_GIT_SKILL = (
    "github.com/pagopa/dx/42a33a17977283eb57387f1ae7195a418b93e40f"
    "/plugins/aiepdf/skills"
)


def test_load_job_meta_models_and_skill_versions(tmp_path, monkeypatch):
    import harbor_mod.compare as cmp

    home = tmp_path / "home"
    monkeypatch.setattr(cmp, "_GIT_CACHE_PREFIX", home / ".cache" / "harbor" / "skills")
    git_skill = str(home / ".cache" / "harbor" / "skills" / _GIT_SKILL)
    job = _make_job(tmp_path, "run-a")
    _write_meta_trial(
        job,
        "task-a",
        agent_model="gpt-5.6-luna",
        agent_effort="high",
        skills=["/some/local/dr-blacksmith", git_skill],
        judge_model="openai/gpt-5.6-luna",
        judge_effort="medium",
    )
    meta = load_job_meta(job)
    assert meta.agent_model == "gpt-5.6-luna"
    assert meta.agent_effort == "high"
    assert meta.judge_model == "openai/gpt-5.6-luna"
    assert meta.judge_effort == "medium"
    local, git = meta.skills
    assert local.kind == "local"
    assert local.name == "dr-blacksmith"
    assert git.kind == "git"
    assert git.repo == "pagopa/dx"
    assert git.ref == "42a33a17977283eb57387f1ae7195a418b93e40f"
    assert git.rel_path == "plugins/aiepdf/skills"
    assert git.version == "(git: pagopa/dx@42a33a17)"


def test_render_markdown_run_config_section(tmp_path, monkeypatch):
    import harbor_mod.compare as cmp

    home = tmp_path / "home"
    monkeypatch.setattr(cmp, "_GIT_CACHE_PREFIX", home / ".cache" / "harbor" / "skills")
    git_skill = str(home / ".cache" / "harbor" / "skills" / _GIT_SKILL)
    job = _make_job(tmp_path, "run-a")
    _write_meta_trial(
        job,
        "task-a",
        agent_model="gpt-5.6-luna",
        agent_effort="high",
        skills=["/some/local/dr-blacksmith", git_skill],
        judge_model="openai/gpt-5.6-luna",
        judge_effort="medium",
    )
    meta = load_job_meta(job)
    base = _make_job(tmp_path, "run-base")
    head = _make_job(tmp_path, "run-head")
    _write_trial(base, "task-a")
    _write_trial(head, "task-a")

    md = render_markdown(
        "run-base",
        "run-head",
        build_report(load_job(base), load_job(head)),
        base_meta=meta,
        head_meta=meta,
    )
    assert "## Run configuration" in md
    assert "agent model" in md
    assert "gpt-5.6-luna (effort: high)" in md
    assert "openai/gpt-5.6-luna (effort: medium)" in md
    assert "dr-blacksmith (local)" in md
    assert "plugins/aiepdf/skills (git: pagopa/dx@42a33a17)" in md
    assert (
        'git -C "$(git rev-parse --show-toplevel)" diff '
        "42a33a17977283eb57387f1ae7195a418b93e40f -- plugins/aiepdf/skills" in md
    )
    assert "verifier tokens" in md
    assert "verifier duration (s)" in md