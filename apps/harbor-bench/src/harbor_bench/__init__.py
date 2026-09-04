"""harbor-bench: PagoPA Harbor CLI for skill benchmarks.

- ``harbor-bench convert``: runtime converter from the agentskills.io
  ``evals/evals.json`` format to runnable Harbor task directories + a
  ready-to-run ``config.yaml`` (the custom agent referenced by that config
  lives in the ``harbor-copilot`` package)
- ``harbor-bench report``: per-task delta report between two Harbor jobs
- ``harbor-bench compare``: run one eval set against two skill versions and
  report the delta
"""

from __future__ import annotations

from importlib.metadata import version as distribution_version

__version__ = distribution_version("harbor-bench")
