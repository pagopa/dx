---
harbor-bench: minor
---

Extend `harbor-bench convert` so a skill declares its own benchmark harness in
its `harbor/` directory: `harbor/environment.toml` for skill-wide
`[environment]` overrides (MCP servers, env-var templates, network policy)
deep-merged into every generated task of the skill, and
`harbor/<task-key>/instruction.append.md` for per-case deterministic "user
answers" appended after the eval prompt (for rubrics that assume an
interactive user). `evals.json` stays the single source of truth for eval
cases.
