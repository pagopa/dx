"""Custom Harbor agents.

Export the :class:`CopilotCliMod` agent and its canonical import path, which
the ``harbor-bench`` CLI writes into generated ``config.yaml`` files.
"""

from .copilot_cli_mod import AGENT_IMPORT_PATH, CopilotCliMod

__all__ = ["AGENT_IMPORT_PATH", "CopilotCliMod"]
