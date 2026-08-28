"""Tests for the Task-shape module: the one owner of writer/reader paths."""

from __future__ import annotations

import pytest

from harbor_bench import task_shape


def test_trial_relative_derives_reader_layout():
    """The reader-side trial layout is derived, never re-declared."""
    assert task_shape.trial_relative(task_shape.TRAJECTORY_JSON) == "agent/trajectory.json"
    assert task_shape.trial_relative(task_shape.VERIFIER_USAGE_JSONL) == "verifier/usage.jsonl"
    assert (
        task_shape.trial_relative(task_shape.REWARD_DETAILS_JSON)
        == "verifier/reward-details.json"
    )
    assert (
        task_shape.trial_relative(task_shape.COPILOT_SESSION_DB)
        == "agent/copilot/session-store.db"
    )
    assert (
        task_shape.trial_relative(task_shape.COPILOT_CLI_JSONL)
        == "agent/copilot-cli.jsonl"
    )


def test_trial_relative_rejects_non_logs_paths():
    with pytest.raises(ValueError, match="no trial-directory path"):
        task_shape.trial_relative("/workspace")


def test_copilot_artifact_paths_are_agent_log_relative():
    """The agent-log-dir coordinates are what copilot_artifact_paths joins to a root."""
    assert task_shape.COPILOT_SESSION_DB_REL == "copilot/session-store.db"
    assert task_shape.COPILOT_CLI_JSONL_REL == "copilot-cli.jsonl"
    # container and trial coordinates derive from the same declaration
    assert task_shape.COPILOT_SESSION_DB == (
        task_shape.AGENT_LOG_DIR + "/" + task_shape.COPILOT_SESSION_DB_REL
    )
    assert task_shape.COPILOT_CLI_JSONL == (
        task_shape.AGENT_LOG_DIR + "/" + task_shape.COPILOT_CLI_JSONL_REL
    )


def test_harbor_artifacts_declare_what_the_report_reads_back():
    """The task.toml artifacts list covers every file jobs.py reads."""
    collected = task_shape.HARBOR_ARTIFACTS
    assert task_shape.WORKSPACE_ARTIFACT in collected
    assert task_shape.COPILOT_CLI_JSONL in collected
    assert task_shape.TRAJECTORY_JSON in collected
    assert task_shape.WORKSPACE_ARTIFACT == {
        "source": "/workspace",
        "exclude": [".git"],
    }


def test_render_template_substitutes_shape_and_extra():
    rendered = task_shape.render_template(
        "trajectory={{TRAJECTORY_JSON}} skill={{SKILL_NAME}} dir={{WORKSPACE_DIR}}",
        SKILL_NAME="test-skill",
    )
    assert rendered == (
        f"trajectory={task_shape.TRAJECTORY_JSON} "
        "skill=test-skill "
        f"dir={task_shape.WORKSPACE_DIR}"
    )
    # unknown placeholders are left untouched
    assert task_shape.render_template("{{UNKNOWN}}") == "{{UNKNOWN}}"


def test_override_targets_are_task_file_inventory():
    assert task_shape.OVERRIDABLE_TARGETS == {
        "task.toml",
        "environment/Dockerfile",
        ".dockerignore",
        "tests/test.sh",
        "tests/quality.toml",
        "tests/Dockerfile",
        "solution/solve.sh",
    }
