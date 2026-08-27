"""harbor-mod: PagoPA Harbor extensions.

- custom Copilot CLI agent (``harbor_mod.agents.CopilotCliMod``) that forwards
  arbitrary ``--ak`` kwargs verbatim to the Copilot CLI
- ``harbor-mod convert``: runtime converter from the agentskills.io
  ``evals/evals.json`` format to runnable Harbor task directories + a
  ready-to-run ``config.yaml``
"""

__version__ = "0.1.0"
