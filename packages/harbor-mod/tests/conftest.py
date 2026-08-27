"""Shared fixtures for harbor-mod tests."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest

# A realistic per-request usage row for the assistant_usage_events table:
# (input_tokens, cache_read, cache_write, output, reasoning, total_nano_aiu).
DEFAULT_USAGE_ROW = (20_474, 0, 20_471, 41, 20, 516_755_000)

CASE_ONE = {
    "id": 1,
    "name": "case-one",
    "prompt": "do the thing",
    "expected_output": "the thing done",
    "expectations": ["inspects repo"],
    "files": [],
    "overlays": [],
}
CASE_TWO = {
    "id": 2,
    "name": "case-two",
    "prompt": "do the other thing",
    "expected_output": "the other thing done",
    "expectations": [],
    "files": [],
    "overlays": [],
}


def write_evals(
    skill: Path,
    *,
    skill_name: str = "test-skill",
    harbor: dict | None = None,
    cases: list[dict] | None = None,
) -> Path:
    """Create a skill dir with an evals.json and return its path."""
    (skill / "evals").mkdir(parents=True, exist_ok=True)
    (skill / "SKILL.md").write_text("# Test")
    data: dict = {"skill_name": skill_name, "evals": cases or [CASE_ONE]}
    if harbor is not None:
        data["harbor"] = harbor
    path = skill / "evals" / "evals.json"
    path.write_text(json.dumps(data))
    return path


def write_session_db(db_path: Path, rows: list[tuple] | None = None) -> None:
    """Write a ``session-store.db`` with an ``assistant_usage_events`` table."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path)
    try:
        con.execute(
            """
            CREATE TABLE assistant_usage_events (
                session_id TEXT,
                turn_index INTEGER,
                model TEXT,
                input_tokens INTEGER,
                cache_read_tokens INTEGER,
                cache_write_tokens INTEGER,
                output_tokens INTEGER,
                reasoning_tokens INTEGER,
                total_nano_aiu INTEGER
            )
            """
        )
        for row in (rows if rows is not None else [DEFAULT_USAGE_ROW]):
            con.execute(
                "INSERT INTO assistant_usage_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ("s1", 0, "gpt-5.6-luna", *row),
            )
        con.commit()
    finally:
        con.close()


def write_copilot_jsonl(
    jsonl_path: Path, output_tokens: list[int], total_nano_aiu: int = 1_665_217_000
) -> None:
    """Write a minimal Copilot CLI JSONL with usage checkpoint + messages."""
    jsonl_path.parent.mkdir(parents=True, exist_ok=True)
    events = [{"type": "model.call_start", "data": {"model": "gpt-5.6-luna"}}]
    events += [
        {"type": "assistant.message", "data": {"outputTokens": tokens}}
        for tokens in output_tokens
    ]
    events.append({"type": "session.usage_checkpoint", "data": {"totalNanoAiu": total_nano_aiu}})
    jsonl_path.write_text(
        "\n".join(json.dumps(event) for event in events) + "\n", encoding="utf-8"
    )


@pytest.fixture
def session_db_factory():
    """Factory fixture writing a session-store.db, returns the path."""
    def _factory(tmp_path: Path, rows: list[tuple] | None = None) -> Path:
        path = tmp_path / "session-store.db"
        write_session_db(path, rows)
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
