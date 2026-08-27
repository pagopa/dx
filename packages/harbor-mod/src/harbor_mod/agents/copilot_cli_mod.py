"""Custom GitHub Copilot CLI agent for PagoPA skill evaluations.

Extends Harbor's built-in :class:`~harbor.agents.installed.copilot_cli.CopilotCli`
with a **generic flag passthrough**: any kwarg passed via ``--ak key=value``
(or ``AgentConfig.kwargs``) that is not already handled by a declared
``CLI_FLAGS``/``ENV_VARS`` descriptor is forwarded verbatim to the Copilot CLI
as ``--kebab-case value`` (bool values are rendered as a bare flag).

This covers ``--max-ai-credits``, ``--enable-memory``, ``--model``,
``--available-tools``, etc. without declaring each one upstream.

It also fixes upstream skill registration: Harbor copies injected skills into
``~/.copilot/``, where Copilot CLI does not discover them — personal skills
must live in ``~/.copilot/skills/``.

It also strips eval data from injected skills **inside the container** during
``setup()``: Harbor uploads each skill dir as-is, so a skill resolved from a
git source (``--skill <repo>@<ref>``) arrives complete with ``evals/`` (the
expected outputs). We remove ``evals/``, ``harbor/``, ``.git`` and
``__pycache__`` from every injected skill as root before the base setup copies
them into ``~/.copilot/skills/``, so the agent under evaluation never sees the
answers — regardless of whether the skill came from the local workspace or
from git.

Load it with::

    harbor run ... --agent harbor_mod.agents.copilot_cli_mod:CopilotCliMod

or reference it in a job ``config.yaml``::

    agents:
      - import_path: harbor_mod.agents.copilot_cli_mod:CopilotCliMod
        kwargs:
          max_ai_credits: 30

The agent code runs host-side: install this package into the Python environment
that runs ``harbor`` (``uv tool install harbor --with 'harbor-mod @ ...'`` or
``PYTHONPATH=<src>``).
"""

from __future__ import annotations

import shlex
from pathlib import Path

from harbor.agents.installed.copilot_cli import CopilotCli
from harbor.models.agent.context import AgentContext

from harbor_mod.copilot_usage import extract_usage_from_session_db

#: Subdirectories removed from every injected skill before it is exposed to the
#: agent. ``evals/`` holds the eval cases + expected outputs (leak protection),
#: ``harbor/`` the eval-harness fixtures, and ``.git``/``__pycache__`` are just
#: noise. Mirrors what the old host-side staging in harbor-mod used to drop.
_STRIPPED_SKILL_DIRS = ("evals", "harbor", ".git", "__pycache__")


class CopilotCliMod(CopilotCli):
    """Copilot CLI agent with generic ``--ak`` flag passthrough.

    Kwarg names are converted to kebab-case: ``max_ai_credits=30`` becomes
    ``--max-ai-credits 30``; boolean values are emitted as a bare flag
    (``--flag`` when truthy, omitted when falsy).

    Everything that is not a Harbor base-agent constructor parameter or a
    declared ``CLI_FLAGS``/``ENV_VARS`` descriptor is forwarded verbatim — no
    per-flag type/choice validation, no whitelist of copilot flags.
    """

    # kwarg names already handled by declared CLI_FLAGS / ENV_VARS descriptors;
    # these are rendered by the base ``build_cli_flags`` and must NOT be
    # duplicated by the generic passthrough.
    _HANDLED = {f.kwarg for f in (*CopilotCli.CLI_FLAGS, *CopilotCli.ENV_VARS)}

    # Harbor base-agent constructor parameters (across BaseInstalledAgent and
    # BaseAgent): these must reach super(), never the copilot CLI.
    _BASE_PARAMS = {
        "logs_dir",
        "prompt_template_path",
        "version",
        "extra_env",
        "config",
        "model_name",
        "logger",
        "mcp_servers",
        "skills_dir",
        "load_trajectory",
        "environment_logs_dir",
    }

    def __init__(self, *args, **kwargs):
        # Capture passthrough kwargs BEFORE super() — the base agent swallows
        # unknown kwargs (they never reach the Copilot CLI otherwise).
        self._passthrough = {
            key: kwargs.pop(key)
            for key in list(kwargs)
            if key not in self._HANDLED and key not in self._BASE_PARAMS
        }
        super().__init__(*args, **kwargs)

    def build_cli_flags(self) -> str:
        """Build the CLI flags string: declared flags + generic passthrough."""
        parts = [super().build_cli_flags()]
        for key, value in self._passthrough.items():
            flag = "--" + key.replace("_", "-")
            if isinstance(value, bool):
                if value:
                    parts.append(flag)
            else:
                parts.append(f"{flag} {shlex.quote(str(value))}")
        return " ".join(p for p in parts if p)

    def _build_register_skills_command(self) -> str | None:
        """Register injected skills in Copilot's personal skills directory.

        Upstream (Harbor v0.22.0) copies into ``~/.copilot/``, where Copilot CLI
        does not discover skills — personal skills are discovered in
        ``~/.copilot/skills/``.
        """
        if not self.skills_dir:
            return None
        return (
            "mkdir -p ~/.copilot/skills && "
            f"cp -r {shlex.quote(self.skills_dir)}/* "
            "~/.copilot/skills/ 2>/dev/null || true"
        )

    def _build_strip_skills_command(self) -> str | None:
        """Build the shell command that removes eval data from injected skills.

        Harbor uploads every injected skill dir as-is (a git-resolved
        ``--skill`` includes ``evals/``), so we delete the sensitive
        subdirectories from each skill *inside the container*, as root, before
        the base setup copies them to ``~/.copilot/skills/``. This keeps the
        eval answers hidden from the agent for both local and git-loaded skills.
        """
        if not self.skills_dir:
            return None
        skills_dir = shlex.quote(self.skills_dir)
        names = " ".join(shlex.quote(name) for name in _STRIPPED_SKILL_DIRS)
        return (
            f"for d in {skills_dir}/*/; do "
            "[ -d \"$d\" ] || continue; "
            f"for name in {names}; do "
            "rm -rf \"$d/$name\"; "
            "done; "
            "done"
        )

    async def setup(self, environment):
        """Base setup, but strip eval data from injected skills first.

        Runs :meth:`_build_strip_skills_command` as root (uploaded skills live
        in ``<skills_dir>/<skill-name>/`` in the container), then delegates to
        the base ``setup()`` which installs the CLI and copies skills into
        ``~/.copilot/skills/``.
        """
        strip_command = self._build_strip_skills_command()
        if strip_command:
            await self.exec_as_root(environment, command=strip_command)
        await super().setup(environment)

    def populate_context_post_run(self, context: AgentContext) -> None:
        """Base post-run parsing, then backfill usage from the session DB.

        The base parser derives token counts from the JSONL stream, which for
        GPT models reports only ``outputTokens`` — input/cache tokens and cost
        are left unset. The Copilot CLI session database
        (``copilot/session-store.db``, preserved next to the logs by the base
        ``_save_session_state``) records per-request input/cache/reasoning token
        counts and a metered cost (``total_nano_aiu``); when available we
        overwrite the trajectory numbers with those authoritative aggregates.
        Extra per-request metrics (request count, reasoning tokens, cache write)
        are surfaced under ``context.metadata`` for drill-down.
        """
        super().populate_context_post_run(context)

        usage = extract_usage_from_session_db(
            Path(self.logs_dir) / "copilot" / "session-store.db"
        )
        if usage is None or not usage.has_data:
            return

        for attr, value in (
            ("n_input_tokens", usage.input_tokens),
            ("n_cache_tokens", usage.cache_tokens),
            ("n_output_tokens", usage.output_tokens),
            ("cost_usd", usage.cost_usd),
        ):
            if value is not None:
                setattr(context, attr, value)
        context.metadata = {
            **(context.metadata or {}),
            "usage_source": usage.source,
            "n_requests": usage.n_requests,
            "reasoning_tokens": usage.reasoning_tokens,
            "cache_read_tokens": usage.cache_read_tokens,
            "cache_write_tokens": usage.cache_write_tokens,
        }
