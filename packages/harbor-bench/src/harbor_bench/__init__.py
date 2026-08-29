"""harbor-bench: PagoPA Harbor extensions.

- custom Copilot CLI agent (``harbor_bench.agents.CopilotCliMod``) that forwards
  arbitrary ``--ak`` kwargs verbatim to the Copilot CLI
- ``harbor-bench convert``: runtime converter from the agentskills.io
  ``evals/evals.json`` format to runnable Harbor task directories + a
  ready-to-run ``config.yaml``
"""

from __future__ import annotations

from importlib.metadata import version as distribution_version

__version__ = distribution_version("harbor-bench")
