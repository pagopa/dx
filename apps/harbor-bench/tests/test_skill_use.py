"""Tests for the generated F1 skill-use proof (``tests/skill_use.py``).

The proof is a predicate over the ATIF trajectory: the tested skill must be
invoked (``skill`` tool call with matching ``arguments.skill``) *and* loaded
(that call's observation carries Copilot's success stem). The fixtures
reproduce the real ATIF shapes recorded by both Copilot CLI stream
generations — the legacy stream (committed 1.0.81 trial) and the current
session-event stream (1.0.97+), which no longer carries the synthetic
``<skill-context>`` user messages."""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

from harbor_bench.convert.task import TEMPLATES

SKILL_USE_PY = TEMPLATES / "skill_use.py"


@pytest.fixture(scope="module")
def skill_use():
    """The template module, imported from source (no placeholders to render)."""
    spec = importlib.util.spec_from_file_location("skill_use", SKILL_USE_PY)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _loaded_observation(name: str, *, legacy: bool = False) -> str:
    """An observation content string as decoded from a real ATIF trajectory.

    Harbor joins the skill-tool result's ``content`` and a serialized
    ``{"detailedContent": ...}`` object with a newline. ``legacy`` mirrors
    the 1.0.81 run (the detail carried the full skill body); the default
    mirrors the 1.0.97+ probe (the body is no longer duplicated in the
    stream).
    """
    stem = f'Skill "{name}" loaded successfully. Follow the instructions in the skill context.'
    detail = "Skill loaded successfully ✅\\n\\n# Skill body" if legacy else stem
    return f"{stem}\n{json.dumps({'detailedContent': detail})}"


def _trajectory(steps: list) -> dict:
    return {"schema_version": "1.0", "steps": steps}


def _skill_step(name: str, observation: str | None) -> dict:
    return {
        "step_id": 2,
        "source": "agent",
        "tool_calls": [
            {
                "tool_call_id": "call_x",
                "function_name": "skill",
                "arguments": {"skill": name},
            }
        ],
        "observation": {"results": [{"source_call_id": "call_x", "content": observation}]},
    }


def _write(tmp_path: Path, payload: dict | str) -> Path:
    path = tmp_path / "trajectory.json"
    path.write_text(payload if isinstance(payload, str) else json.dumps(payload))
    return path


def test_current_stream_success(tmp_path: Path, skill_use):
    traj = _trajectory([_skill_step("prd-alchemist", _loaded_observation("prd-alchemist"))])
    assert skill_use.skill_used(str(_write(tmp_path, traj)), "prd-alchemist") is True


def test_legacy_stream_success(tmp_path: Path, skill_use):
    traj = _trajectory(
        [_skill_step("prd-alchemist", _loaded_observation("prd-alchemist", legacy=True))]
    )
    assert skill_use.skill_used(str(_write(tmp_path, traj)), "prd-alchemist") is True


def test_call_for_a_different_skill_does_not_count(tmp_path: Path, skill_use):
    traj = _trajectory([_skill_step("uc-engraver", _loaded_observation("uc-engraver"))])
    assert skill_use.skill_used(str(_write(tmp_path, traj)), "prd-alchemist") is False


def test_failed_load_does_not_count(tmp_path: Path, skill_use):
    traj = _trajectory(
        [_skill_step("prd-alchemist", 'Skill not found: prd-alchemist\n{"code": "failure"}')]
    )
    assert skill_use.skill_used(str(_write(tmp_path, traj)), "prd-alchemist") is False


def test_success_stem_without_the_matching_call_does_not_count(
    tmp_path: Path, skill_use
):
    traj = _trajectory(
        [
            {
                "step_id": 1,
                "source": "agent",
                "tool_calls": [{"function_name": "bash", "arguments": {}}],
                "observation": {
                    "results": [{"content": _loaded_observation("prd-alchemist")}]
                },
            }
        ]
    )
    assert skill_use.skill_used(str(_write(tmp_path, traj)), "prd-alchemist") is False


def test_skill_call_without_observation_does_not_count(tmp_path: Path, skill_use):
    # A stream that ends right after the call (no execution result) has no
    # load proof; the step's observation is absent.
    traj = _trajectory([_skill_step("prd-alchemist", None)])
    assert skill_use.skill_used(str(_write(tmp_path, traj)), "prd-alchemist") is False


def test_no_skill_step_does_not_count(tmp_path: Path, skill_use):
    traj = _trajectory([{"step_id": 1, "source": "agent", "tool_calls": []}])
    assert skill_use.skill_used(str(_write(tmp_path, traj)), "prd-alchemist") is False


def test_missing_trajectory_does_not_count(tmp_path: Path, skill_use):
    assert skill_use.skill_used(str(tmp_path / "nope.json"), "prd-alchemist") is False


def test_malformed_trajectory_does_not_count(tmp_path: Path, skill_use):
    assert skill_use.skill_used(str(_write(tmp_path, "not json {")), "prd-alchemist") is False
    assert skill_use.skill_used(str(_write(tmp_path, '"just a string"')), "prd-alchemist") is False


def test_defensive_shapes_do_not_crash(tmp_path: Path, skill_use):
    traj = _trajectory(
        [
            "not-a-step",
            {"step_id": 1, "tool_calls": "not-a-list"},
            {"step_id": 2, "tool_calls": [{"function_name": "skill", "arguments": "raw"}]},
            {"step_id": 3, "tool_calls": [{"function_name": "skill", "arguments": {}}]},
            {
                "step_id": 4,
                "tool_calls": [
                    {"function_name": "skill", "arguments": {"skill": "prd-alchemist"}}
                ],
                "observation": "not-a-dict",
            },
            {
                "step_id": 5,
                "tool_calls": [
                    {"function_name": "skill", "arguments": {"skill": "prd-alchemist"}}
                ],
                "observation": {"results": ["not-a-dict", {"content": 7}]},
            },
        ]
    )
    assert skill_use.skill_used(str(_write(tmp_path, traj)), "prd-alchemist") is False


def test_cli_protocol(tmp_path: Path):
    good = _trajectory([_skill_step("prd-alchemist", _loaded_observation("prd-alchemist"))])
    good_path = _write(tmp_path, good)

    ok = subprocess.run(
        [sys.executable, str(SKILL_USE_PY), str(good_path), "prd-alchemist"],
        capture_output=True,
        text=True,
    )
    assert ok.returncode == 0
    assert ok.stdout.strip() == "1"

    missing = subprocess.run(
        [sys.executable, str(SKILL_USE_PY), str(tmp_path / "nope.json"), "prd-alchemist"],
        capture_output=True,
        text=True,
    )
    assert missing.returncode == 0
    assert missing.stdout.strip() == "0"

    usage = subprocess.run(
        [sys.executable, str(SKILL_USE_PY)], capture_output=True, text=True
    )
    assert usage.returncode == 2
    assert "usage:" in usage.stderr
