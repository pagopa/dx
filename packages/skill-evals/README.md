# Skill Evals

`@pagopa/skill-evals` runs **portable evaluations for Agent Skills**. A skill is
the Markdown playbook an AI agent follows. This package does **not**
live inside the skill: the skill only owns the test data, and the runner
executes it the same way in local debug and in CI.

Each evaluation asks: _does the current skill help the agent do the right
thing, compared with a previous version of that skill (or with no skill at
all)?_

The runner:

1. Builds two isolated copies of the problem (same prompt, same starter files).
2. Lets Copilot CLI solve one copy **with the local skill** (`current`) and one
   copy **with a baseline** (`previous commit` or `without-skill`).
3. Collects evidence (answers, diffs, tool calls, usage).
4. Asks a second, isolated model — the **grader** — to score both runs against
   a written **rubric** and a list of **assertions**.
5. Writes `summary.json` / `summary.md` and exits non-zero if the current skill
   failed or the grader returned invalid output.

No interactive input is required after launch. An authenticated Copilot CLI
session is required before you start.

## Glossary

These words are used throughout the package. They are not Terraform-specific.

| Term                   | Meaning                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Eval**               | One test case: a prompt, optional starter repository, expected behaviour, and checks. Declared in `evals/evals.json`.                                                              |
| **Suite**              | All evals in that manifest, or the subset selected with `--eval`.                                                                                                                  |
| **Current**            | The skill as it exists on disk right now (your working tree). Always labelled `local`.                                                                                             |
| **Baseline**           | The comparison skill: usually the previous Git commit of `SKILL.md`, or a ref you pass with `--baseline-ref`. If no previous copy exists, the baseline runs **without** the skill. |
| **Fixture / scaffold** | Starter files copied into a disposable Git repo so the agent has a realistic workspace.                                                                                            |
| **Assertion**          | A yes/no statement the grader must judge, for example “no secret value is written into Terraform”.                                                                                 |
| **Rubric**             | The scoring guide (`evals/rubric.md`): named criteria, a 0–2 scale, and pass/fail **gates**.                                                                                       |
| **Grader**             | A separate Copilot session that does **not** see the skill plugin. It only reads a grading packet and must return one JSON object.                                                 |
| **Gate**               | A boolean pass rule derived from rubric scores (for example “every safety criterion scored 2”). Keys are defined by the skill.                                                     |
| **Hook**               | An optional script the skill owns (`evals/scripts/…`) that runs at suite or eval lifecycle points.                                                                                 |
| **Knowledge base**     | Extra read-only docs/code the agent may inspect (for DX skills, usually the `pagopa/dx` checkout).                                                                                 |
| **Mechanical check**   | Deterministic facts the runner records without an LLM: did Copilot exit 0, did the skill load, did it get invoked, is there a git diff.                                            |
| **Guardrail**          | A stable ID inside an assertion (for example `TF-G01`) used for coverage reports. Optional.                                                                                        |

## Prerequisites

- Node.js `>= 22.22.0`, `pnpm`, and this monorepo.
- Copilot CLI on `PATH` (or pass `--copilot-bin`), already logged in.
- Git, because fixtures are committed and the baseline is resolved from history.

From the workspace root (Nx builds the CLI first):

```bash
pnpm nx run @pagopa/skill-evals:validate -- --skill <skill-directory>
pnpm nx run @pagopa/skill-evals:scaffold -- --skill <skill-directory> --eval <name> --output <empty-dir>
pnpm nx run @pagopa/skill-evals:eval -- --skill <skill-directory>
```

From `packages/skill-evals` after a build, the same commands are
`pnpm run validate|scaffold|eval -- …`.

`<skill-directory>` can be repo-relative (`plugins/terraform/skills/terraform-best-practices`)
or absolute. The CLI resolves paths from the Git toplevel when you are inside
the checkout.

## User manual

### 1. Check the manifest

```bash
pnpm nx run @pagopa/skill-evals:validate -- \
  --skill plugins/terraform/skills/terraform-best-practices
```

This reads `evals/evals.json` and checks:

- JSON shape, unique eval `id` / `name`
- referenced fixture files, hook scripts, grader and rubric paths
- unresolved `<placeholders>` in prompts
- optional guardrail coverage against a catalog file

`--strict-files` turns “this eval says it needs fixtures but listed none” into
an error instead of a warning. `eval` always validates in that strict mode
before it starts.

### 2. Inspect one workspace locally

```bash
pnpm nx run @pagopa/skill-evals:scaffold -- \
  --skill plugins/terraform/skills/terraform-best-practices \
  --eval prefer-dx-storage-module \
  --output /tmp/tf-eval-storage
```

Copies the eval’s fixture files into an empty directory, initializes Git, and
prints the prompt plus whether the knowledge-base env var is set. It does **not**
call Copilot, Terraform, or the network. Useful when writing a new eval.

### 3. Run evaluations

Full suite:

```bash
pnpm nx run @pagopa/skill-evals:eval -- \
  --skill plugins/terraform/skills/terraform-best-practices
```

One or more cases while iterating:

```bash
pnpm nx run @pagopa/skill-evals:eval -- \
  --skill plugins/terraform/skills/terraform-best-practices \
  --eval prefer-dx-storage-module \
  --eval key-vault-reference-safety
```

Prepare plugins and workspaces without spending AI credits:

```bash
pnpm nx run @pagopa/skill-evals:eval -- \
  --skill plugins/terraform/skills/terraform-best-practices \
  --dry-run
```

#### `eval` flags

| Flag                          | Default                                    | Purpose                                                 |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| `--skill <dir>`               | required                                   | Skill directory that contains `evals/evals.json`.       |
| `--eval <name>`               | all evals                                  | Repeatable. Run only these cases.                       |
| `--output <dir>`              | temp dir under `/tmp/skill-evals/<skill>/` | Must be missing or empty.                               |
| `--baseline-ref <ref>`        | previous `SKILL.md` commit                 | Branch, tag, or SHA for the baseline skill.             |
| `--dry-run`                   | off                                        | Stop after plugins + workspaces are prepared.           |
| `--copilot-bin <path>`        | `copilot`                                  | Copilot CLI executable.                                 |
| `--main-model <model>`        | `gpt-5.6-sol`                              | Model that **plays the agent** (current and baseline).  |
| `--grader-model <model>`      | `gpt-5-mini`                               | Model that **scores** both runs.                        |
| `--reasoning-effort <effort>` | `high`                                     | Copilot `--effort`: `low`, `medium`, `high`, `xhigh`.   |
| `--max-ai-credits <n>`        | `30`                                       | Per-session Copilot credit cap.                         |
| `-v` / `--verbose`            | quiet                                      | Local progress: phases, models, tools, credits, timing. |
| `-vv` / `--verbose=2`         | —                                          | Also print prompts, agent Q&A, and tool arguments.      |

CI should omit `-v` so the Nx TUI stays quiet. Full JSONL event logs are always
written to the artifact directory.

Verbose lines look like:

```text
10:21:00.000 [DBG] prefer-dx-storage-module: Eval prefer-dx-storage-module current=pass (local) baseline=fail (8ca09db) winner=current · suite 33 credits · 6m 43s model · 1103435 in / 26316 out · grok-4.6, gpt-5-mini · wall 7m 27s
```

`current=pass (local)` is the working-tree skill. `baseline=fail (8ca09db)` is
the previous commit (or `branch@sha`, or `without-skill`).

The command exits `1` when any **current** eval fails, or when the grader never
returns valid JSON. A failing baseline alone does not fail CI: that is the
point of the comparison.

## How a run works

```text
validate evals.json
        │
        ▼
prepare runtime
  • copy local skill → current plugin (no evals/ or scripts/)
  • resolve baseline plugin (previous SKILL.md, --baseline-ref, or none)
  • copy supporting skills into both plugins when available
  • resolve knowledge base, list user MCP servers to disable
        │
        ▼
before_all hook (optional)
        │
        ▼
for each eval
  ├─ materialize two Git workspaces from the same fixtures
  ├─ current:  Copilot + current plugin + prompt [+ follow_up]
  ├─ baseline: Copilot + baseline plugin (or no plugin) + same prompt
  ├─ after_each hook on each variant (optional)
  ├─ collect evidence (response, diff, tools, mechanical.json, metrics)
  └─ grader session (no skill plugin, view tool only)
        │     invalid JSON → one retry
        │     mechanical failures override a passing LLM grade
        ▼
after_all hook (always, even on failure)
        │
        ▼
summary.json + summary.md
```

Both variants use the same model, effort, tool allow-list, disabled MCPs, and
credit cap. The grader is a **third** session per eval: it cannot load the
skill under test, so it cannot “help” the answer it is scoring.

### Current vs baseline vs without-skill

The framework always runs **two agent sessions** per eval. It never asks you
“with or without skill?” — that decision is only about **what the baseline
plugin contains**.

| Variant                        | What the agent sees                                                                                                                                                                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **current**                    | Isolated plugin built from the skill directory on disk. Label: `local`.                                                                                                                                                                                        |
| **baseline, previous version** | Isolated plugin from `git archive` of `--baseline-ref`, or of the previous commit that touched `SKILL.md` (`git log`; index `[0]` is HEAD, `[1]` is the baseline). Label: short SHA, or `branch@sha` when you passed a named ref / the commit is a branch tip. |
| **baseline, without-skill**    | No `--plugin-dir` for the skill under test. Used when there is no Git repo, no previous `SKILL.md` commit, or that ref has no `SKILL.md`. Label: `without-skill`.                                                                                              |

Supporting skills listed in the manifest are copied into both plugin
directories when a source exists. When the baseline is `without-skill`, Copilot
is started **without** `--plugin-dir`, so that session sees neither the
evaluated skill nor the supporting skills.

**Current** must load and invoke the evaluated skill or the runner forces
`pass: false`, even if the grader liked the answer. **Baseline** may pass
without invoking the skill, so a first-commit or without-skill comparison still
works.

If a configured knowledge base is a Git checkout, the runner snapshots
`git status` before and after the suite and fails if the agent dirtied it.

## Skill layout

The skill owns only evaluation data. Keep scripts and fixtures under `evals/`
so they are **not** copied into the plugin the agent sees.

```text
<skill>/
├── SKILL.md                 # playbook the agent should follow
├── references/              # optional docs the skill points to
└── evals/
    ├── evals.json           # manifest (required)
    ├── grader.md            # how the scoring model must judge and which JSON to emit
    ├── rubric.md            # criteria, scores, and gates
    ├── scripts/             # optional hooks (not visible to the agent)
    └── scaffolds/           # optional starter files
        └── <name>/repository/…
```

## File formats

### `evals/evals.json`

Root object. `schema_version` must be `1`.

```json
{
  "schema_version": 1,
  "skill_name": "terraform-best-practices",
  "runner": {
    "prompt_prefix": "Invoke the terraform-best-practices skill before acting.",
    "available_tools": ["view", "skill", "bash"],
    "supporting_skills": [
      {
        "name": "technology-radar",
        "repository_path": "plugins/standards/skills/technology-radar"
      }
    ],
    "knowledge_base": {
      "environment_variable": "DX_KB_PATH",
      "markers": ["apps/website/docs/terraform", "infra/modules"],
      "fallback_path": "~/.dx",
      "clone_url": "https://github.com/pagopa/dx.git"
    }
  },
  "grading": {
    "instructions": "evals/grader.md",
    "rubric": "evals/rubric.md"
  },
  "hooks": {
    "after_each": "evals/scripts/after-each.sh"
  },
  "validation": {
    "coverage": {
      "catalog": "references/guardrails.md",
      "pattern": "TF-G[0-9]{2}",
      "require_all": true
    },
    "required_fixture_prefixes": [
      "evals/scaffolds/azure-consumer-base/repository/"
    ]
  },
  "evals": [
    {
      "id": 1,
      "name": "prefer-dx-storage-module",
      "prompt": "Add a storage account using the DX module.",
      "expected_output": "The workspace uses Azure Storage via the pagopa-dx module.",
      "assertions": ["[TF-G01] No secret values are written into Terraform."],
      "files": [
        "evals/scaffolds/azure-consumer-base/repository/infra/resources/dev/main.tf"
      ],
      "fixture_required": true,
      "knowledge_base": "available"
    }
  ]
}
```

#### `runner`

| Field               | Required | Meaning                                                                                                                                                                                                                                                                       |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prompt_prefix`     | yes      | Prepended to every agent prompt (current and baseline). Use it to tell the agent to invoke the skill.                                                                                                                                                                         |
| `available_tools`   | yes      | Copilot tool allow-list. At least one name.                                                                                                                                                                                                                                   |
| `supporting_skills` | no       | Extra skills copied into the isolated plugins. Each entry needs `name` and `repository_path` (relative to the Git root). If that directory is missing, an enabled Copilot install of the same `name` is used instead. If neither exists, the extra skill is skipped.          |
| `knowledge_base`    | no       | How to find extra docs. Resolution order: `environment_variable`, repo root, cwd, `fallback_path`, then `git clone --depth 1 clone_url`. A candidate is accepted only if every `markers` path exists as a directory. Needed when any eval sets `knowledge_base: "available"`. |

#### `grading`

Both paths must be Markdown files under `evals/`.

| Field          | Meaning                                                                             |
| -------------- | ----------------------------------------------------------------------------------- |
| `instructions` | Prompt for the scoring model: evidence rules and the **exact JSON** it must return. |
| `rubric`       | Human-written scorecard included in the grading packet.                             |

#### `hooks`

Optional paths under `evals/`. Same names as Vitest lifecycle hooks:

| Hook          | When                                           | Extra env                  |
| ------------- | ---------------------------------------------- | -------------------------- |
| `before_all`  | After runtime setup, before any eval           | suite only                 |
| `before_each` | After a workspace is created, before Copilot   | eval + variant + workspace |
| `after_each`  | After Copilot turns, before evidence is frozen | + artifact dir             |
| `after_all`   | After the suite, even if an eval failed        | suite only                 |

Every hook receives `SKILL_EVAL_HOOK`, `SKILL_EVAL_SKILL_DIR`, and
`SKILL_EVAL_OUTPUT_DIR`. Per-eval hooks also get `SKILL_EVAL_NAME`,
`SKILL_EVAL_VARIANT` (`current` \| `baseline`), `SKILL_EVAL_WORKSPACE`, and
(for `after_each`) `SKILL_EVAL_ARTIFACT_DIR`.

A non-zero exit fails the run. `after_each` may print a **single flat JSON
object** on stdout (`{ "terraformFormat": true }`); keys are merged into
`mechanical.json`. Any other stdout is ignored so logs cannot break a pass.

#### `validation` (optional)

| Field                       | Meaning                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coverage.catalog`          | Text file that lists official IDs (guardrails).                                                                                                           |
| `coverage.pattern`          | JavaScript regex that extracts those IDs.                                                                                                                 |
| `coverage.require_all`      | Default `true`. Every catalog ID must appear in at least one assertion.                                                                                   |
| `required_fixture_prefixes` | If `fixture_required` is true, the eval’s `files` must include at least one path with each prefix (keeps overlay-only lists from dropping the base tree). |

#### Each object in `evals`

`id` and `name` must be unique. `prompt` cannot contain `<angle-bracket>`
placeholders.

| Field              | Required | Meaning                                                                                                     |
| ------------------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| `id`               | yes      | Stable non-negative integer.                                                                                |
| `name`             | yes      | Directory name and `--eval` selector (`kebab-case`).                                                        |
| `prompt`           | yes      | What the agent is asked to do.                                                                              |
| `follow_up`        | no       | Second user turn in the **same** Copilot session (scripted answer to an expected question).                 |
| `expected_output`  | yes      | Prose description of a good result. The grader reads this; it is not matched as a string.                   |
| `assertions`       | yes      | One or more yes/no checks. Include every statement you want scored. Prefix with `[ID]` if you use coverage. |
| `files`            | yes      | Fixture paths. Use `[]` only when `fixture_required` is false.                                              |
| `fixture_required` | yes      | Whether this eval needs a starter repo.                                                                     |
| `knowledge_base`   | no       | `"available"` (default `"unavailable"`). `"available"` requires a resolvable knowledge base.                |

### Fixtures

Every path in `files` must look like:

```text
evals/scaffolds/<anything>/repository/<destination/inside/workspace>
```

`..` is rejected. Several scaffolds can be layered: later files cannot target
the same destination path. The runner copies each file to
`<workspace>/<destination>` and commits them so `git diff` only shows the
agent’s edits.

Example: `evals/scaffolds/overlays/payments-context/repository/infra/resources/dev/payments.locals.tf`
lands at `infra/resources/dev/payments.locals.tf`.

Evals with `fixture_required: false` still get an empty Git repo so diffs work.

### `evals/rubric.md`

This file is **not** parsed by TypeScript. It is pasted into the grading packet
as-is. Write it so a model can apply it consistently.

Recommended shape:

1. **Score scale**, typically:
   - `0` — missing, unsafe, or contrary
   - `1` — partial or weakly justified
   - `2` — complete and aligned
   - `N/A` / `null` — the prompt does not exercise the criterion (excluded from averages)
2. **Criteria table**: name, optional guardrail ID, when it applies, what to check.
3. **Gates**: boolean rules over those scores (safety, completeness, …). A
   variant should pass only when every applicable gate passes (and any overall
   threshold you define).

The runner only requires that the grader’s JSON lists at least one rubric row
per variant, with `score` in `0…2` or `null`.

### `evals/grader.md`

Instructions for the scoring model. The runner sends this file, the rubric, the
eval input, and both evidence bundles, then accepts **only** JSON (Markdown
fences are stripped). Invalid output is retried once, then the eval is marked
as a grading error.

Required object (field names are validated):

```json
{
  "eval_name": "prefer-dx-storage-module",
  "current": {
    "assertions": [
      {
        "assertion": "exact assertion text from evals.json",
        "passed": true,
        "evidence": "short quote from the packet"
      }
    ],
    "rubric": [
      {
        "criterion": "criterion name from rubric.md",
        "score": 2,
        "evidence": "short quote from the packet"
      }
    ],
    "gates": {
      "safety": true,
      "completeness": true
    },
    "pass": true,
    "summary": "short assessment"
  },
  "baseline": {},
  "comparison": {
    "winner": "current",
    "material_differences": ["evidence-backed difference"],
    "regressions": []
  }
}
```

Rules the runner enforces:

- `eval_name` must match the case being graded.
- `current.assertions` and `baseline.assertions` must be the **same set** of
  strings as `evals.json` (order ignored).
- `winner` is `current`, `baseline`, or `tie`.
- `gates` is an open map of booleans — define the keys in `grader.md` so they
  match `rubric.md`.
- `score` is `0`, `1`, `2`, or `null` (not applicable).

After the model returns, the runner may flip `pass` to `false` when execution
failed, or when **current** did not load and invoke the skill.

## Artifacts

Default output: `/tmp/skill-evals/<skill-name>/<timestamp>-XXXX/`.

```text
<output>/
├── metadata.json
├── summary.json
├── summary.md
├── runtime/                         # isolated plugins, optional cloned KB
└── <eval-name>/
    ├── grade.json
    ├── grading-packet.md
    ├── grading/attempt-1/           # grader session
    ├── current/
    │   ├── workspace/               # disposable repo the agent edited
    │   ├── turn-1.events.jsonl
    │   ├── telemetry.jsonl
    │   ├── combined-response.md
    │   ├── diff.patch
    │   ├── mechanical.json
    │   ├── metrics.json
    │   └── tool-requests.json
    └── baseline/                    # same layout
```

`mechanical.json` always includes `executionSuccess`, `skillLoaded`,
`skillInvoked`, `diffCheck`, and `addedPlaceholders`, plus any flat keys from
`after_each`.

## What “pass” means

For **current** (this is what CI uses):

1. Copilot exited successfully.
2. The isolated plugin loaded the skill and the agent invoked it.
3. The grader returned valid JSON.
4. The grader’s `current.pass` is true after mechanical constraints.

For **baseline**, (2) is not required. The report still shows
baseline pass/fail and a `winner` so you can see regressions or “the old skill
was already good”.

`summary.md` also lists recurring failed assertion IDs when `validation.coverage.pattern`
is set.
