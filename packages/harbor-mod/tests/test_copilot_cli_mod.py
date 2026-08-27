"""Tests for the CopilotCliMod custom agent."""

from __future__ import annotations

from harbor_mod.agents import CopilotCliMod
from harbor_mod.agents.copilot_cli_mod import CopilotCli

BASE_FLAGS = {"reasoning_effort"} | {f.kwarg for f in CopilotCli.ENV_VARS}


def test_handled_skips_declared_flags():
    agent = CopilotCliMod(logs_dir="logs", reasoning_effort="high", max_ai_credits=30)
    flags = agent.build_cli_flags()
    assert "--effort high" in flags  # base CLI_FLAGS rendered by super()
    assert "--max-ai-credits 30" in flags
    assert "--reasoning-effort high" not in flags  # no duplicate passthrough


def test_kebab_case_and_quoting():
    agent = CopilotCliMod(logs_dir="logs", enable_memory=True, plugin_dir="/root/.dx")
    flags = agent.build_cli_flags()
    assert "--enable-memory" in flags
    assert "--plugin-dir /root/.dx" in flags


def test_bool_false_omitted():
    agent = CopilotCliMod(logs_dir="logs", enable_memory=False)
    flags = agent.build_cli_flags()
    assert "--enable-memory" not in flags


def test_int_and_str_coercion():
    agent = CopilotCliMod(logs_dir="logs", max_ai_credits="30", extra="true")
    flags = agent.build_cli_flags()
    assert "--max-ai-credits 30" in flags
    assert "--extra true" in flags


def test_no_passthrough_kwargs():
    agent = CopilotCliMod(logs_dir="logs")
    assert agent.build_cli_flags().strip() == ""


def test_register_skills_command_targets_copilot_skills():
    agent = CopilotCliMod(logs_dir="logs", skills_dir="/tmp/staged-skill")
    cmd = agent._build_register_skills_command()
    assert cmd is not None
    assert "~/.copilot/skills" in cmd
    assert "/tmp/staged-skill" in cmd


def test_register_skills_none_without_skills_dir():
    agent = CopilotCliMod(logs_dir="logs")
    assert agent._build_register_skills_command() is None
