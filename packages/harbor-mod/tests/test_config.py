"""Tests for config.yaml emission (JobConfig schema)."""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from harbor_mod.convert.config import (
    DEFAULT_AGENT_KWARGS,
    DEFAULT_MODEL,
    DEFAULT_ENVIRONMENT_TYPE,
    build_config,
    collect_declared_kwargs,
    write_config,
)


def test_default_model_and_effort(tmp_path: Path):
    config = build_config(tasks_dir=tmp_path / "tasks", skill_dirs=[])
    assert config["agents"][0]["model_name"] == DEFAULT_MODEL
    assert config["agents"][0]["kwargs"] == DEFAULT_AGENT_KWARGS


def test_kwargs_override_default(tmp_path: Path):
    config = build_config(
        tasks_dir=tmp_path / "tasks",
        skill_dirs=[],
        kwargs={"reasoning_effort": "low"},
    )
    assert config["agents"][0]["kwargs"] == {"reasoning_effort": "low"}


def test_kwargs_merge_with_default(tmp_path: Path):
    config = build_config(
        tasks_dir=tmp_path / "tasks",
        skill_dirs=[],
        kwargs={"max_ai_credits": 50},
    )
    assert config["agents"][0]["kwargs"] == {
        "reasoning_effort": "high",
        "max_ai_credits": 50,
    }


def test_build_config_with_skills(tmp_path: Path):
    config = build_config(
        tasks_dir=tmp_path / "tasks",
        skill_dirs=[tmp_path / "skills" / "test-skill"],
        kwargs={"max_ai_credits": 30, "reasoning_effort": "high"},
    )
    assert config["agents"][0]["import_path"] == "harbor_mod.agents.copilot_cli_mod:CopilotCliMod"
    assert config["agents"][0]["skills"] == [str(tmp_path / "skills" / "test-skill")]
    assert config["agents"][0]["kwargs"] == {"max_ai_credits": 30, "reasoning_effort": "high"}
    assert config["datasets"] == [{"path": str(tmp_path / "tasks")}]
    assert config["n_concurrent_trials"] == 4


def test_without_skill_omits_skills(tmp_path: Path):
    config = build_config(
        tasks_dir=tmp_path / "tasks",
        skill_dirs=[tmp_path / "skills" / "test-skill"],
        without_skill=True,
    )
    assert "skills" not in config["agents"][0]


def test_model_and_jobs_dir(tmp_path: Path):
    config = build_config(
        tasks_dir=tmp_path / "tasks",
        skill_dirs=[],
        model="claude-sonnet-4",
        jobs_dir=tmp_path / "out",
        n_concurrent_trials=2,
    )
    assert config["agents"][0]["model_name"] == "claude-sonnet-4"
    assert config["jobs_dir"] == str(tmp_path / "out")
    assert config["n_concurrent_trials"] == 2


def test_write_config_yaml_roundtrip(tmp_path: Path):
    config = build_config(tasks_dir=tmp_path / "tasks", skill_dirs=[])
    out = write_config(config, tmp_path / "config.yaml")
    loaded = yaml.safe_load(out.read_text())
    assert loaded == config


def test_collect_declared_kwargs_merges_compatible():
    merged = collect_declared_kwargs(
        [
            ("skill-a", {"max_ai_credits": 30}),
            ("skill-b", {"max_ai_credits": 30, "enable_memory": True}),
        ]
    )
    assert merged == {"max_ai_credits": 30, "enable_memory": True}


def test_collect_declared_kwargs_conflict_raises():
    with pytest.raises(ValueError, match="conflicting harbor.kwargs"):
        collect_declared_kwargs(
            [
                ("skill-a", {"reasoning_effort": "high"}),
                ("skill-b", {"reasoning_effort": "low"}),
            ]
        )


def test_collect_declared_kwargs_diagnostic_lists_skills_and_keys():
    with pytest.raises(ValueError) as excinfo:
        collect_declared_kwargs(
            [
                ("skill-a", {"reasoning_effort": "high"}),
                ("skill-b", {"reasoning_effort": "low"}),
            ]
        )
    message = str(excinfo.value)
    assert "reasoning_effort" in message
    assert "skill-a" in message
    assert "skill-b" in message


def test_declared_kwargs_override_defaults(tmp_path: Path):
    config = build_config(
        tasks_dir=tmp_path / "tasks",
        skill_dirs=[],
        declared_kwargs={"reasoning_effort": "low"},
    )
    assert config["agents"][0]["kwargs"] == {"reasoning_effort": "low"}


def test_cli_kwargs_override_declared(tmp_path: Path):
    config = build_config(
        tasks_dir=tmp_path / "tasks",
        skill_dirs=[],
        declared_kwargs={"reasoning_effort": "low", "max_ai_credits": 30},
        kwargs={"reasoning_effort": "high"},
    )
    assert config["agents"][0]["kwargs"] == {
        "reasoning_effort": "high",
        "max_ai_credits": 30,
    }


def test_defaults_remain_without_declared_or_cli_kwargs(tmp_path: Path):
    config = build_config(tasks_dir=tmp_path / "tasks", skill_dirs=[])
    assert config["agents"][0]["kwargs"] == DEFAULT_AGENT_KWARGS


def test_default_environment_type_is_docker(tmp_path: Path):
    config = build_config(tasks_dir=tmp_path / "tasks", skill_dirs=[])
    assert config["environment"] == {"type": DEFAULT_ENVIRONMENT_TYPE}
    assert config["environment"]["type"] == "docker"


def test_apple_container_environment_type(tmp_path: Path):
    config = build_config(
        tasks_dir=tmp_path / "tasks",
        skill_dirs=[],
        environment_type="apple-container",
    )
    assert config["environment"] == {"type": "apple-container"}


def test_unsupported_environment_type_raises(tmp_path: Path):
    with pytest.raises(ValueError, match="unsupported environment type"):
        build_config(
            tasks_dir=tmp_path / "tasks",
            skill_dirs=[],
            environment_type="podman",
        )
