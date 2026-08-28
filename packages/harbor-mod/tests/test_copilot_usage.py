"""Tests for Copilot CLI usage extraction from session artifacts."""

from __future__ import annotations

from pathlib import Path

from harbor_mod.copilot_usage import (
    copilot_artifact_paths,
    extract_usage,
    extract_usage_from_jsonl,
    extract_usage_from_session_db,
)

from tests.conftest import DEFAULT_USAGE_ROW, write_copilot_jsonl, write_session_db


def test_extract_from_session_db_aggregates(tmp_path):
    db = tmp_path / "session-store.db"
    write_session_db(
        db,
        rows=[
            DEFAULT_USAGE_ROW,
            (35_190, 31_087, 4_100, 359, 290, 207_814_000),
        ],
    )
    usage = extract_usage_from_session_db(db)
    assert usage is not None
    assert usage.input_tokens == 55_664  # 20474 + 35190
    assert usage.cache_read_tokens == 31_087
    assert usage.cache_write_tokens == 24_571
    assert usage.output_tokens == 400
    assert usage.reasoning_tokens == 310
    assert usage.cost_usd == 0.724569  # (516755000 + 207814000) / 1e9
    assert usage.n_requests == 2
    assert usage.source == "session-store.db"
    assert usage.has_data


def test_extract_from_missing_db_returns_none(tmp_path):
    assert extract_usage_from_session_db(tmp_path / "nope.db") is None


def test_extract_from_non_sqlite_file_returns_none(tmp_path):
    path = tmp_path / "session-store.db"
    path.write_text("not a database", encoding="utf-8")
    assert extract_usage_from_session_db(path) is None


def test_extract_from_empty_table_returns_none(tmp_path):
    db = tmp_path / "session-store.db"
    write_session_db(db, rows=[])
    assert extract_usage_from_session_db(db) is None


def test_extract_from_null_metrics_reports_none(tmp_path):
    db = tmp_path / "session-store.db"
    write_session_db(db, rows=[(None, None, None, None, None, None)])
    usage = extract_usage_from_session_db(db)
    assert usage is not None
    assert usage.n_requests == 1
    assert not usage.has_data
    assert usage.input_tokens is None
    assert usage.cost_usd is None


def test_extract_from_jsonl_fallback(tmp_path):
    jsonl = tmp_path / "copilot-cli.jsonl"
    write_copilot_jsonl(jsonl, output_tokens=[41, 196])
    usage = extract_usage_from_jsonl(jsonl)
    assert usage is not None
    assert usage.output_tokens == 237
    assert usage.cost_usd == 1.665217
    assert usage.n_requests == 1
    assert usage.input_tokens is None  # not present in the stream
    assert usage.source == "copilot-cli.jsonl"


def test_extract_from_missing_jsonl_returns_none(tmp_path):
    assert extract_usage_from_jsonl(tmp_path / "nope.jsonl") is None


def test_copilot_artifact_paths_relative_to_root():
    db, jsonl = copilot_artifact_paths(Path("/trial/agent"))
    assert db == Path("/trial/agent/copilot/session-store.db")
    assert jsonl == Path("/trial/agent/copilot-cli.jsonl")


def test_extract_usage_prefers_session_db(tmp_path):
    db = tmp_path / "session-store.db"
    write_session_db(db, rows=[DEFAULT_USAGE_ROW])
    jsonl = tmp_path / "copilot-cli.jsonl"
    write_copilot_jsonl(jsonl, output_tokens=[41])
    usage = extract_usage(db, jsonl)
    assert usage is not None
    assert usage.source == "session-store.db"
    assert usage.input_tokens == 20_474


def test_extract_usage_falls_back_to_jsonl(tmp_path):
    jsonl = tmp_path / "copilot-cli.jsonl"
    write_copilot_jsonl(jsonl, output_tokens=[41])
    usage = extract_usage(tmp_path / "nope.db", jsonl)
    assert usage is not None
    assert usage.source == "copilot-cli.jsonl"
    assert usage.cost_usd == 1.665217


def test_extract_usage_none_without_artifacts(tmp_path):
    assert extract_usage(tmp_path / "nope.db", tmp_path / "nope.jsonl") is None
