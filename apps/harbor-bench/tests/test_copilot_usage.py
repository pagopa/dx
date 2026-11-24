"""Tests for Copilot usage extraction from the trial's agent artifacts."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

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

# Matches the ``sessionStartTime`` that ``write_copilot_usage`` writes.
SESSION_START = "2026-11-23T10:00:00.000Z"

# A resumed trial's snapshot: the earlier segment's requests (5) plus the two
# the resumed segment made, with every token count and the nano-AIU price
# scaled the same way (57,000 = 50,000 + 7,000 and so on).
RESUMED_MODEL = {
    "requests": {"count": 7, "cost": 7},
    "usage": {
        "inputTokens": 57_000,
        "outputTokens": 400,
        "cacheReadTokens": 31_000,
        "cacheWriteTokens": 24_000,
        "reasoningTokens": 300,
    },
    "totalNanoAiu": 700_000_000,
}
BASELINE_MODEL = {
    "requests": {"count": 5, "cost": 5},
    "usage": {
        "inputTokens": 50_000,
        "outputTokens": 300,
        "cacheReadTokens": 30_000,
        "cacheWriteTokens": 20_000,
        "reasoningTokens": 200,
    },
    "totalNanoAiu": 500_000_000,
}


def write_copilot_baseline(
    usage_path: Path,
    models: dict,
    session_start_time: str = SESSION_START,
) -> Path:
    """Write the pre-resume snapshot Harbor leaves beside a resumed usage file."""
    path = usage_path.with_name("copilot-usage-baseline.json")
    data = {"sessionStartTime": session_start_time, "modelMetrics": models}
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


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


def test_usage_file_with_non_object_model_metrics_returns_none(tmp_path):
    path = tmp_path / "copilot-usage.json"
    path.write_text(
        json.dumps({"sessionStartTime": SESSION_START, "modelMetrics": [1]}),
        encoding="utf-8",
    )

    assert extract_usage_from_usage_file(path) is None


def test_usage_file_with_a_string_token_counter_returns_none(tmp_path):
    path = tmp_path / "copilot-usage.json"
    model = {**DEFAULT_USAGE_MODEL, "usage": {"inputTokens": "unknown"}}
    write_copilot_usage(path, {"gpt-6-luna": model})

    assert extract_usage_from_usage_file(path) is None


def test_malformed_usage_file_falls_back_to_jsonl(tmp_path):
    usage_file = tmp_path / "copilot-usage.json"
    model = {**DEFAULT_USAGE_MODEL, "usage": {"inputTokens": "unknown"}}
    write_copilot_usage(usage_file, {"gpt-6-luna": model})
    jsonl = tmp_path / "copilot-cli.jsonl"
    write_copilot_jsonl(jsonl, output_tokens=[41])

    usage = extract_usage(usage_file, jsonl)

    assert usage is not None
    assert usage.source == "copilot-cli.jsonl"
    assert usage.output_tokens == 41


def test_usage_file_without_requests_reports_no_request_count(tmp_path):
    path = tmp_path / "copilot-usage.json"
    model = {key: value for key, value in DEFAULT_USAGE_MODEL.items() if key != "requests"}
    write_copilot_usage(path, {"gpt-6-luna": model})

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.n_requests is None
    assert usage.input_tokens == 55_664


def test_recorded_zero_is_reported_as_zero_and_omitted_counter_as_none(tmp_path):
    path = tmp_path / "copilot-usage.json"
    model = {
        "requests": {"count": 1, "cost": 1},
        "usage": {"inputTokens": 100, "cacheReadTokens": 0},
        "totalNanoAiu": 10_000_000,
    }
    write_copilot_usage(path, {"gpt-6-luna": model})

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.input_tokens == 100
    assert usage.cache_read_tokens == 0  # recorded zero, not unknown
    assert usage.cache_write_tokens is None  # omitted by the snapshot


def test_resumed_segment_with_a_zero_token_delta_reports_zero(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(path, {"gpt-6-luna": RESUMED_MODEL})
    write_copilot_baseline(path, {"gpt-6-luna": RESUMED_MODEL})

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.input_tokens == 0  # 57,000 - 57,000
    assert usage.cache_read_tokens == 0  # 31,000 - 31,000
    assert usage.reasoning_tokens == 0  # 300 - 300
    assert usage.n_requests == 0  # 7 - 7


def test_baseline_without_a_counter_subtracts_zero(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(path, {"gpt-6-luna": RESUMED_MODEL})
    baseline = {**BASELINE_MODEL, "usage": {"inputTokens": 50_000}}
    write_copilot_baseline(path, {"gpt-6-luna": baseline})

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.input_tokens == 7_000  # 57,000 - 50,000
    assert usage.cache_read_tokens == 31_000  # baseline carries none: subtract 0


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


def test_resumed_trial_subtracts_the_same_session_baseline(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(path, {"gpt-6-luna": RESUMED_MODEL})
    # A model the resumed segment never used stays out of the totals.
    write_copilot_baseline(
        path, {"gpt-6-luna": BASELINE_MODEL, "claude-sonnet-5.5": SECOND_USAGE_MODEL}
    )

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.n_requests == 2  # 7 - 5
    assert usage.input_tokens == 7_000  # 57_000 - 50_000
    assert usage.cache_read_tokens == 1_000  # 31_000 - 30_000
    assert usage.cache_write_tokens == 4_000  # 24_000 - 20_000
    assert usage.output_tokens == 100  # 400 - 300
    assert usage.reasoning_tokens == 100  # 300 - 200
    assert usage.cost_usd == pytest.approx(0.002)  # 200,000,000 nano-AIU
    assert usage.source == "copilot-usage.json"


def test_baseline_from_a_different_session_is_ignored(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(path, {"gpt-6-luna": RESUMED_MODEL})
    write_copilot_baseline(
        path,
        {"gpt-6-luna": BASELINE_MODEL},
        session_start_time="2026-11-23T11:00:00.000Z",
    )

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.n_requests == 7
    assert usage.input_tokens == 57_000
    assert usage.cost_usd == pytest.approx(0.007)


def test_missing_or_corrupt_baseline_leaves_usage_unchanged(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(path, {"gpt-6-luna": RESUMED_MODEL})
    baseline = path.with_name("copilot-usage-baseline.json")

    before = extract_usage_from_usage_file(path)
    assert before is not None
    assert before.input_tokens == 57_000

    baseline.write_text("not json", encoding="utf-8")
    corrupt = extract_usage_from_usage_file(path)
    assert corrupt is not None
    assert corrupt.input_tokens == 57_000

    baseline.unlink()
    missing = extract_usage_from_usage_file(path)
    assert missing is not None
    assert missing.input_tokens == 57_000


def test_malformed_baseline_is_ignored(tmp_path):
    path = tmp_path / "copilot-usage.json"
    write_copilot_usage(path, {"gpt-6-luna": RESUMED_MODEL})
    baseline = write_copilot_baseline(path, {"gpt-6-luna": BASELINE_MODEL})
    data = json.loads(baseline.read_text(encoding="utf-8"))
    data["modelMetrics"]["gpt-6-luna"]["usage"]["inputTokens"] = "unknown"
    baseline.write_text(json.dumps(data), encoding="utf-8")

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.input_tokens == 57_000  # baseline ignored: nothing subtracted
    assert usage.n_requests == 7
    assert usage.cost_usd == pytest.approx(0.007)


def test_baseline_larger_than_the_snapshot_clamps_at_zero(tmp_path):
    path = tmp_path / "copilot-usage.json"
    current = {
        "requests": {"count": 1, "cost": 1},
        "usage": {"inputTokens": 10},
        "totalNanoAiu": 50_000_000,
    }
    write_copilot_usage(path, {"gpt-6-luna": current})
    write_copilot_baseline(path, {"gpt-6-luna": BASELINE_MODEL})

    usage = extract_usage_from_usage_file(path)

    assert usage is not None
    assert usage.n_requests == 0
    assert usage.input_tokens == 0  # 10 - 50,000 clamps to zero, still measured
    assert usage.cost_usd == 0.0


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
