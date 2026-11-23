"""Tests for Copilot usage extraction from the trial's agent artifacts."""

from __future__ import annotations

import json
from pathlib import Path

from harbor_bench.copilot_usage import (
    copilot_artifact_paths,
    extract_usage,
    extract_usage_from_jsonl,
    extract_usage_from_usage_file,
)

from tests.conftest import (
    DEFAULT_USAGE_MODEL,
    SECOND_USAGE_MODEL,
    write_copilot_jsonl,
    write_copilot_usage,
)


def test_extract_from_usage_file_aggregates_every_model(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(
        path,
        {
            "gpt-6-luna": DEFAULT_USAGE_MODEL,
            "claude-sonnet-5.5": SECOND_USAGE_MODEL,
        },
    )

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.input_tokens == 56_664  # 55_664 + 1_000
    assert usage.cache_read_tokens == 31_287  # 31_087 + 200
    assert usage.cache_write_tokens == 24_871  # 24_571 + 300
    assert usage.output_tokens == 450  # 400 + 50
    assert usage.reasoning_tokens == 320  # 310 + 10
    assert usage.n_requests == 3  # 2 + 1
    assert usage.cost_usd == 0.00824569  # nano-AIU * $0.01 per AIU / 1e9
    assert usage.source == "copilot-usage.json"
    assert usage.has_data


def test_extract_from_usage_file_counts_requests_per_model(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(path, {"gpt-6-luna": DEFAULT_USAGE_MODEL})

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.n_requests == 2


def test_extract_from_missing_usage_file_returns_none(tmp_path):
    assert extract_usage_from_usage_file(tmp_path / "nope.json") is None


def test_extract_from_corrupt_usage_file_returns_none(tmp_path):
    path = tmp_path / "copilot-usage.json"
    path.write_text("not json", encoding="utf-8")

    assert extract_usage_from_usage_file(path) is None


def test_extract_from_usage_file_with_no_model_metrics_returns_none(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(path, {})

    assert extract_usage_from_usage_file(path) is None


def test_usage_file_without_requests_reports_no_request_count(tmp_path):
    path = tmp_path / "copilot-usage.json"
    model = {key: value for key, value in DEFAULT_USAGE_MODEL.items() if key != "requests"}
    write_copilot_usage(path, {"gpt-6-luna": model})

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.n_requests is None
    assert usage.input_tokens == 55_664


def test_unpriced_ai_credits_report_no_cost(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(path, ai_credits_status="partial")

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.cost_usd is None
    assert usage.output_tokens == 400


def test_model_without_nano_aiu_reports_no_cost(tmp_path):
    path = tmp_path / "copilot-usage.json"
    model = {key: value for key, value in DEFAULT_USAGE_MODEL.items() if key != "totalNanoAiu"}
    write_copilot_usage(path, {"gpt-6-luna": DEFAULT_USAGE_MODEL, "other": model})

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.cost_usd is None


def test_extract_from_jsonl_fallback(tmp_path):
    jsonl = tmp_path / "copilot-cli.jsonl"
    write_copilot_jsonl(jsonl, output_tokens=[41, 196])

    usage = extract_usage_from_jsonl(jsonl)

    assert usage is not None
    assert usage.output_tokens == 237
    assert usage.cost_usd == 0.01665217
    assert usage.n_requests == 1
    assert usage.input_tokens is None  # not present in the stream
    assert usage.source == "copilot-cli.jsonl"


def test_extract_from_missing_jsonl_returns_none(tmp_path):
    assert extract_usage_from_jsonl(tmp_path / "nope.jsonl") is None


def test_copilot_artifact_paths_relative_to_root():
    usage_file, jsonl = copilot_artifact_paths(Path("/trial/agent"))

    assert usage_file == Path("/trial/agent/copilot-usage.json")
    assert jsonl == Path("/trial/agent/copilot-cli.jsonl")


def test_extract_usage_prefers_the_usage_file(tmp_path):
    usage_file = tmp_path / "copilot-usage.json"
    write_copilot_usage(usage_file)
    jsonl = tmp_path / "copilot-cli.jsonl"
    write_copilot_jsonl(jsonl, output_tokens=[41])

    usage = extract_usage(usage_file, jsonl)

    assert usage is not None
    assert usage.source == "copilot-usage.json"
    assert usage.input_tokens == 55_664


def test_extract_usage_falls_back_to_jsonl(tmp_path):
    jsonl = tmp_path / "copilot-cli.jsonl"
    write_copilot_jsonl(jsonl, output_tokens=[41])

    usage = extract_usage(tmp_path / "nope.json", jsonl)

    assert usage is not None
    assert usage.source == "copilot-cli.jsonl"
    assert usage.cost_usd == 0.01665217


def test_extract_usage_ignores_a_baseline_snapshot(tmp_path):
    """The baseline is upstream's resume bookkeeping, not this run's usage."""
    usage_file = tmp_path / "copilot-usage.json"
    write_copilot_usage(usage_file)
    (tmp_path / "copilot-usage-baseline.json").write_text(
        json.dumps({"modelMetrics": {}}), encoding="utf-8"
    )

    usage = extract_usage(usage_file, tmp_path / "nope.jsonl")

    assert usage is not None
    assert usage.input_tokens == 55_664


def test_extract_usage_none_without_artifacts(tmp_path):
    assert extract_usage(tmp_path / "nope.json", tmp_path / "nope.jsonl") is None
