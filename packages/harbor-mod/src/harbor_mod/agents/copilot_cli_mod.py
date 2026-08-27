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

from harbor.agents.installed.copilot_cli import CopilotCli


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
