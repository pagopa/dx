"""Shared fixtures for harbor-bench tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

# One realistic ``copilot-usage.json`` model entry: two requests that consumed
# 55,664 input tokens (31,087 of them cache reads, 24,571 cache writes), 400
# output tokens of which 310 were reasoning, and 724,569,000 nano-AIU.
DEFAULT_USAGE_MODEL = {
    "requests": {"count": 2, "cost": 2},
    "usage": {
        "inputTokens": 55_664,
        "outputTokens": 400,
        "cacheReadTokens": 31_087,
        "cacheWriteTokens": 24_571,
        "reasoningTokens": 310,
    },
    "totalNanoAiu": 724_569_000,
}
SECOND_USAGE_MODEL = {
    "requests": {"count": 1, "cost": 1},
    "usage": {
        "inputTokens": 1_000,
        "outputTokens": 50,
        "cacheReadTokens": 200,
        "cacheWriteTokens": 300,
        "reasoningTokens": 10,
    },
    "totalNanoAiu": 100_000_000,
}

CASE_ONE = {
    "id": 1,
    "name": "case-one",
    "prompt": "do the thing",
    "expected_output": "the thing done",
    "expectations": ["inspects repo"],
    "files": [],
}
CASE_TWO = {
    "id": 2,
    "name": "case-two",
    "prompt": "do the other thing",
    "expected_output": "the other thing done",
    "expectations": [],
    "files": [],
}


def write_evals(
    skill: Path,
    *,
    skill_name: str = "test-skill",
    cases: list[dict] | None = None,
) -> Path:
    """Create a skill dir with an evals.json and return its path."""
    (skill / "evals").mkdir(parents=True, exist_ok=True)
    (skill / "SKILL.md").write_text("# Test")
    data: dict = {"skill_name": skill_name, "evals": cases or [CASE_ONE]}
    path = skill / "evals" / "evals.json"
    path.write_text(json.dumps(data))
    return path


def write_copilot_usage(
    usage_path: Path,
    models: dict | None = None,
    ai_credits_status: str | None = "ok",
) -> None:
    """Write a ``copilot-usage.json`` as the Copilot CLI ``--usage-output-file`` does."""
    usage_path.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "sessionStartTime": "2026-11-23T10:00:00.000Z",
        "totalPremiumRequestCost": sum(
            (model.get("requests") or {}).get("count", 0)
            for model in (models or {"gpt-6-luna": DEFAULT_USAGE_MODEL}).values()
        ),
        "aiCreditsStatus": ai_credits_status,
        "modelMetrics": models
        if models is not None
        else {"gpt-6-luna": DEFAULT_USAGE_MODEL},
    }
    usage_path.write_text(json.dumps(data), encoding="utf-8")


def write_copilot_jsonl(
    jsonl_path: Path, output_tokens: list[int], total_nano_aiu: int = 1_665_217_000
) -> None:
    """Write a minimal Copilot CLI JSONL with usage checkpoint + messages."""
    jsonl_path.parent.mkdir(parents=True, exist_ok=True)
    events = [{"type": "model.call_start", "data": {"model": "gpt-6-luna"}}]
    events += [
        {"type": "assistant.message", "data": {"outputTokens": tokens}}
        for tokens in output_tokens
    ]
    events.append({"type": "session.usage_checkpoint", "data": {"totalNanoAiu": total_nano_aiu}})
    jsonl_path.write_text(
        "\n".join(json.dumps(event) for event in events) + "\n", encoding="utf-8"
    )


@pytest.fixture
def usage_factory():
    """Factory fixture writing a copilot-usage.json, returns the path."""

    def _factory(
        tmp_path: Path,
        models: dict | None = None,
        ai_credits_status: str | None = "ok",
    ) -> Path:
        path = tmp_path / "copilot-usage.json"
        write_copilot_usage(path, models, ai_credits_status)
        return path

    return _factory


@pytest.fixture
def jsonl_factory():
    """Factory fixture writing a copilot-cli.jsonl, returns the path."""

    def _factory(
        tmp_path: Path,
        output_tokens: list[int] | None = None,
        total_nano_aiu: int = 1_665_217_000,
    ) -> Path:
        path = tmp_path / "copilot-cli.jsonl"
        write_copilot_jsonl(path, output_tokens or [41], total_nano_aiu)
        return path

    return _factory
