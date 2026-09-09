---
harbor-bench: minor
---

Make a skill's `harbor/` directory a pure **overlay** over the tasks
`harbor-bench convert` generates, so a skill can ship its own benchmark
harness next to `evals.json` by dropping files in place instead of relying on
converter-discovered layout hooks.

Precedence over a generated task: converter defaults < per-eval `files` <
generated files < suite overlay < per-task overlay < run-level flags
(e.g. `--without-skill`, re-applied by the converter). `evals.json` stays the
source of truth for the eval cases.
