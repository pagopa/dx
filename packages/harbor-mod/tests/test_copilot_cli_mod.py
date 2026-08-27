"""Tests for the CopilotCliMod custom agent."""

from __future__ import annotations

import asyncio
import types
from pathlib import Path

from harbor.models.agent.context import AgentContext

from harbor_mod.agents import CopilotCliMod
from harbor_mod.agents.copilot_cli_mod import (
    _STRIPPED_SKILL_DIRS,
    CopilotCli,
)

from tests.conftest import write_session_db

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


def test_strip_skills_command_removes_eval_data():
    agent = CopilotCliMod(logs_dir="logs", skills_dir="/harbor/skills")
    cmd = agent._build_strip_skills_command()
    assert cmd is not None
    assert "/harbor/skills" in cmd
    for name in _STRIPPED_SKILL_DIRS:
        assert name in cmd
    assert "rm -rf" in cmd


def test_strip_skills_none_without_skills_dir():
    agent = CopilotCliMod(logs_dir="logs")
    assert agent._build_strip_skills_command() is None


class _FakeEnvironment:
    """Minimal stand-in for Harbor's BaseEnvironment in agent setup tests."""

    def __init__(self) -> None:
        self.calls: list[tuple[str | None, str]] = []

    async def exec(self, command, user=None, env=None, cwd=None, timeout_sec=None):
        self.calls.append((user, command))
        return types.SimpleNamespace(return_code=0, stdout="", stderr="")


def test_setup_strips_skills_as_root_before_base_setup(monkeypatch):
    env = _FakeEnvironment()
    agent = CopilotCliMod(logs_dir=Path("logs"), skills_dir="/harbor/skills")

    # The base setup would try to install the Copilot CLI over the network;
    # stub install() so we only exercise the strip + setup ordering.
    async def _noop_install(_environment):
        return None

    monkeypatch.setattr(agent, "install", _noop_install)
    asyncio.run(agent.setup(env))

    strip_commands = [
        cmd for user, cmd in env.calls if user == "root" and "rm -rf" in cmd
    ]
    assert strip_commands, "expected a root strip command for the injected skills"
    assert "/harbor/skills" in strip_commands[0]

    strip_idx = next(i for i, (_, cmd) in enumerate(env.calls) if "rm -rf" in cmd)
    mkdir_idx = next(
        i for i, (_, cmd) in enumerate(env.calls) if "/installed-agent" in cmd
    )
    assert strip_idx < mkdir_idx, "strip must run before the base setup copies skills"


def test_populate_context_post_run_backfills_usage_from_session_db(tmp_path):
    """GPT runs miss input/cache/cost; the session DB backfills them."""
    logs = tmp_path / "logs"
    write_session_db(
        logs / "copilot" / "session-store.db",
        rows=[(35_190, 31_087, 4_100, 359, 290, 207_814_000)],
    )
    agent = CopilotCliMod(logs_dir=logs)
    context = AgentContext(n_output_tokens=41)
    agent.populate_context_post_run(context)
    assert context.n_input_tokens == 35_190
    assert context.n_cache_tokens == 31_087
    assert context.n_output_tokens == 359  # DB is authoritative
    assert context.cost_usd == 0.207814
    assert context.metadata["n_requests"] == 1
    assert context.metadata["reasoning_tokens"] == 290
    assert context.metadata["cache_read_tokens"] == 31_087
    assert context.metadata["cache_write_tokens"] == 4_100
    assert context.metadata["usage_source"] == "session-store.db"


def test_populate_context_post_run_leaves_context_without_session_db(tmp_path):
    logs = tmp_path / "logs"
    logs.mkdir(parents=True, exist_ok=True)
    agent = CopilotCliMod(logs_dir=logs)
    context = AgentContext(n_output_tokens=41)
    agent.populate_context_post_run(context)
    assert context.n_input_tokens is None
    assert context.cost_usd is None
    assert context.metadata is None
