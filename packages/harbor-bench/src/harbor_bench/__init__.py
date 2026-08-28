"""harbor-bench: PagoPA Harbor extensions.

- custom Copilot CLI agent (``harbor_bench.agents.CopilotCliMod``) that forwards
  arbitrary ``--ak`` kwargs verbatim to the Copilot CLI
- ``harbor-bench convert``: runtime converter from the agentskills.io
  ``evals/evals.json`` format to runnable Harbor task directories + a
  ready-to-run ``config.yaml``
"""

__version__ = "0.1.0"
