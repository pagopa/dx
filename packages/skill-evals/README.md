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

Use `--eval <name>` to select individual cases, `--dry-run` to prepare plugins and workspaces without AI calls, and `--baseline-ref <ref>` to override the previous committed skill version.

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
- optional reference-coverage validation
- eval prompts, scripted follow-ups, expected output, assertions, and fixture files

Fixture paths must be under `evals/scaffolds/**/repository/`. Files after the `repository/` segment are copied to the same relative path in a disposable Git repository.

The runner writes each variant's responses, events, telemetry, tool requests, Git diff, mechanical checks, and metrics beside the final `summary.json` and `summary.md`.
