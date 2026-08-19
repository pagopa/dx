# Skill Evals

Reusable TypeScript runner for Agent Skill evaluations. It keeps eval infrastructure outside individual skills while supporting:

- deterministic manifest, fixture, execution, and skill-invocation checks
- isolated current and previous-commit baseline plugins
- multi-turn Copilot CLI sessions without interactive input
- one model-graded comparison per eval with a single retry for invalid JSON
- token, duration, model, and Copilot AI-credit metrics
- JSON and Markdown reports with CI-compatible exit codes

## Commands

Run commands from the workspace root:

```bash
pnpm nx run @pagopa/skill-evals:validate -- --skill <skill-directory> --strict-files
pnpm nx run @pagopa/skill-evals:scaffold -- --skill <skill-directory> --eval <name> --output <directory>
pnpm nx run @pagopa/skill-evals:eval -- --skill <skill-directory>
```

Use `--eval <name>` to select individual cases, `--dry-run` to prepare plugins and workspaces without AI calls, `--baseline-ref <ref>` to override the previous committed skill version, and `--verbose` for continuous local progress.

`--verbose` streams run parameters, phase changes, Copilot model/tool activity, credit and token usage, and wall-clock timing. Omit it in CI to keep the default quiet summary.

## Skill Contract

Each skill owns only its evaluation data:

```text
<skill>/
├── evals/
│   ├── evals.json
│   ├── grader.md
│   ├── rubric.md
│   └── scaffolds/
├── references/
└── SKILL.md
```

`evals.json` declares:

- runner settings, supporting skills, and an optional knowledge base
- grader and rubric paths
- optional Vitest-style lifecycle hooks under `evals/`
- optional reference-coverage validation
- eval prompts, scripted follow-ups, expected output, assertions, and fixture files

Optional hooks:

| Hook | When |
| --- | --- |
| `before_all` | once after runtime setup, before any eval |
| `before_each` | after a workspace is materialized, before Copilot |
| `after_each` | after the Copilot turns, before evidence is written |
| `after_all` | once after the suite, even if an eval fails |

Hook scripts receive `SKILL_EVAL_HOOK`, `SKILL_EVAL_SKILL_DIR`, `SKILL_EVAL_OUTPUT_DIR`, and when applicable `SKILL_EVAL_NAME`, `SKILL_EVAL_VARIANT`, `SKILL_EVAL_WORKSPACE`, and `SKILL_EVAL_ARTIFACT_DIR`. A non-zero exit fails the run. Flat JSON on stdout from `after_each` is merged into `mechanical.json`.

The knowledge-base environment variable comes from `runner.knowledge_base.environment_variable`. Grader `gates` are an open boolean map defined by the skill's `grader.md`.

Fixture paths must be under `evals/scaffolds/**/repository/`. Files after the `repository/` segment are copied to the same relative path in a disposable Git repository.

The runner writes each variant's responses, events, telemetry, tool requests, Git diff, mechanical checks, and metrics beside the final `summary.json` and `summary.md`.
