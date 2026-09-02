"""Tests for the CopilotCliMod custom agent."""

from __future__ import annotations

import asyncio
import types
from pathlib import Path

from harbor.models.agent.context import AgentContext

from harbor_bench.agents import CopilotCliMod
from harbor_bench.agents.copilot_cli_mod import CopilotCli

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


class _FakeEnvironment:
    """Minimal stand-in for Harbor's BaseEnvironment in agent setup tests."""

    def __init__(self) -> None:
        self.calls: list[tuple[str | None, str]] = []

    async def exec(self, command, user=None, env=None, cwd=None, timeout_sec=None):
        self.calls.append((user, command))
        return types.SimpleNamespace(return_code=0, stdout="", stderr="")


class _ProbeEnvironment(_FakeEnvironment):
    """Fake env that reports whether the Copilot CLI is installed."""

    def __init__(self, installed: bool) -> None:
        super().__init__()
        self._installed = installed

    async def exec(self, command, user=None, env=None, cwd=None, timeout_sec=None):
        self.calls.append((user, command))
        if "command -v copilot" in command:
            return types.SimpleNamespace(
                return_code=0,
                stdout="installed" if self._installed else "missing",
                stderr="",
            )
        return types.SimpleNamespace(return_code=0, stdout="", stderr="")


def test_install_skips_reinstall_when_copilot_already_installed():
    env = _ProbeEnvironment(installed=True)
    agent = CopilotCliMod(logs_dir=Path("logs"))
    asyncio.run(agent.install(env))
    commands = " ".join(cmd for _, cmd in env.calls)
    assert "copilot-install" not in commands
    assert commands.count("command -v copilot") == 1


def test_install_runs_base_install_when_copilot_missing():
    env = _ProbeEnvironment(installed=False)
    agent = CopilotCliMod(logs_dir=Path("logs"))
    asyncio.run(agent.install(env))
    commands = " ".join(cmd for _, cmd in env.calls)
    assert "gh.io/copilot-install" in commands


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
    assert context.cost_usd == 0.00207814
    assert context.metadata["n_requests"] == 1
    assert context.metadata["n_reasoning_tokens"] == 290
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
