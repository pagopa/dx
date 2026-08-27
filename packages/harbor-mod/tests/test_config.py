"""Tests for config.yaml emission (JobConfig schema)."""

from __future__ import annotations

from pathlib import Path

import yaml

from harbor_mod.convert.config import build_config, write_config


def test_build_config_with_skills(tmp_path: Path):
    config = build_config(
        tasks_dir=tmp_path / "tasks",
        skill_dirs=[tmp_path / "skills" / "test-skill"],
        kwargs={"max_ai_credits": 30, "reasoning_effort": "high"},
    )
    assert config["agents"][0]["import_path"] == "harbor_mod.agents.copilot_cli_mod:CopilotCliMod"
    assert config["agents"][0]["skills"] == [str(tmp_path / "skills" / "test-skill")]
    assert config["agents"][0]["kwargs"] == {"max_ai_credits": 30, "reasoning_effort": "high"}
    assert config["tasks"] == [{"path": str(tmp_path / "tasks")}]
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
