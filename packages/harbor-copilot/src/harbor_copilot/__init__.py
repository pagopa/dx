"""harbor-copilot: the custom Copilot CLI agent for PagoPA skill evaluations.

The package implements only the agent side of a Harbor benchmark run: the
:class:`~harbor_copilot.agents.copilot_cli_mod.CopilotCliMod` agent that Harbor
imports at runtime, plus the metric registry and Copilot usage parser it shares
with the ``harbor-bench`` CLI app (which reads a trial back). Import it through
the canonical path::

    harbor_copilot.agents.copilot_cli_mod:CopilotCliMod
"""

from __future__ import annotations

from importlib.metadata import version as distribution_version

__version__ = distribution_version("harbor-copilot")
