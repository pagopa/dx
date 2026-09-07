---
name: harbor-eval-authoring
description: Author or extend the benchmark eval suite of a skill for the harbor-bench harness: write or edit its `evals/evals.json` (agentskills.io cases), stage fixture files the agent needs, add optional `harbor/prepare.sh` setup, and keep cases reproducible. Use when asked to create evals for a skill, add or change an eval case, wire fixture `.md`/data files into a skill's evals, make an existing eval idempotent, or debug why a skill's cases fail to convert or compare cleanly.
---

# Harbor eval authoring

Each skill under test carries its own benchmark: a `evals/evals.json` in the
skill folder, next to its `SKILL.md`. Harbor's converter turns every case into
a runnable task, a Copilot CLI agent executes it, and an LLM judge scores the
run against the rubric you write. This skill is the self-contained reference:
it does not depend on harbor-bench's sources or docs being present.

The agentskills.io file is the single source of truth. Edit it; do not hand-edit
generated tasks (re-running the converter regenerates tasks from the file and
removes stale ones, leaving job results untouched).

## When to use

- creating the first `evals/evals.json` for a skill, or adding a case;
- adjusting the rubric (expected output / expectations) of a case;
- adding or replacing the files a case's agent needs in its workspace;
- making an eval whose effect is on shared external state (a live Confluence
  page, a shared service) idempotent and comparable across runs.

## Workflow

1. **Read the skill before writing cases.** Open `SKILL.md` and any scripts it
   ships. A case must exercise a real, scriptable behaviour of the skill; name
   that behaviour in the rubric so the judge can tell it apart.
2. **Write the eval cases** in `evals/evals.json` following the schema in
   [evals.json](#evalsjson). Keep ids unique and stable — the id is embedded in
   the generated task name (`<skill>-<id>-<name>`), so renumbering or renaming
   a case invalidates old task names and any per-case prepare script path.
3. **Decide each case's inputs.** Two workspace layers feed the agent:
   - a common base layer at `harbor/workspace/` (tree preserved, shared by all
     cases);
   - per-case files listed in `files` (staged **by basename** into the
     workspace root, folders dropped).
     Rules and collisions: [Fixtures and the workspace](#fixtures-and-the-workspace).
4. **Seed anything the case needs to exist before the agent runs** with a
   `prepare.sh` when plain fixture files cannot express it — see
   [Build-time setup hooks](#build-time-setup-hooks-preparesh). Prefer files
   over prepare scripts; the script runs at image build with no live-service
   credentials.
5. **Make external-state cases idempotent** — the failure mode that breaks
   base/head comparisons. See [Idempotency for live fixtures](#idempotency-for-live-fixtures).
6. **Validate.** Parse `evals.json` as JSON; confirm every `files` path exists
   relative to the skill directory and stays inside it; when the harbor-bench
   CLI is available, run its `convert` command and fix any "file not found",
   "unsafe relative path", or "workspace path collision" error it reports.

## evals.json

Shape of one file:

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 0,
      "name": "optional-human-name",
      "prompt": "Single user turn the agent receives.",
      "expected_output": "Short statement of the successful result.",
      "expectations": ["Observable behaviour the judge checks."],
      "files": ["fixtures/seed.csv"]
    }
  ]
}
```

Field rules:

| Field             | Required | Meaning                                                                |
| ----------------- | -------- | ---------------------------------------------------------------------- |
| `skill_name`      | yes      | Skill name (matches the skill under test).                             |
| `evals[].id`      | yes      | Unique integer. Embedded in task names; stable across edits.           |
| `evals[].name`    | no       | Human label; slugs into the task name and the per-case prepare dir.    |
| `prompt`          | yes      | The agent's single instruction. Name files it needs exactly as staged. |
| `expected_output` | yes      | First grading criterion: what success looks like.                      |
| `expectations[]`  | no       | One extra grading criterion per bullet (behavioural, observable).      |
| `files[]`         | no       | Paths relative to the skill directory (the folder holding `SKILL.md`). |

Rejections the converter enforces: duplicate ids; empty `prompt` /
`expected_output`; extra top-level keys beyond `skill_name`/`evals`; extra
keys inside a case beyond the table above; any `files` path that is absolute,
contains `..`, is missing, or escapes the skill directory. Write only the
documented keys.

## Fixtures and the workspace

Two layers compose into the workspace the agent starts in; a path collision
between layers is an error, never a silent overwrite:

1. **`harbor/workspace/`** (per skill, optional) — the base layer. Copied
   preserving its tree. Good for files every case shares.
2. **`files`** (per case, optional) — each entry is copied into the workspace
   root **by basename only**; subfolders in the path are dropped. So a case
   listing `fixtures/design-review.md` lands a single `design-review.md` in the
   workspace. Give distinct basenames to entries of one case, and let the
   `prompt` reference the staged basename.

Other files under `harbor/` are ignored by the converter.

Fixture markdown is often deliberately byte-stable (soft-wrapped prose, aligned
tables, whitespace that a document normalizer must see). If the repository
runs Prettier, exclude fixture folders from formatting (e.g.
`plugins/**/skills/*/fixtures/**` in the repo's `.prettierignore`); otherwise a
format pass rewrites the input and the case stops testing what it should.

## Build-time setup hooks (`prepare.sh`)

Optional shell scripts run at image build, after the workspace is copied and
before the deterministic git baseline:

- suite-wide: `harbor/prepare.sh`;
- one case: `harbor/<task-key>/prepare.sh`, where `<task-key>` is the case
  `name`, or the case `id` when the case has no name. The case-specific script
  wins over the suite-wide one.

The chosen script is copied into the workspace as `prepare.sh`; a fixture with
that name, or an eval `name` equal to `workspace` (reserved for
`harbor/workspace`), is rejected. The script installs tooling or seeds files
before the agent runs. It has no live-service credentials: it cannot reseed a
Confluence page or reach an authenticated external system between trials.

## Grading

RewardKit, an LLM judge, scores each run. The rubric is your
`expected_output` plus every `expectations` bullet — one binary criterion per
entry. Write them as **observable behaviours** the judge can find in the agent
transcript and produced files ("creates a fresh working copy and never edits
the seed", "returns the updated page URL only after a successful update"), not
as internal intentions. The agent is expected to load the skill and invoke it;
a run that never loads the skill is failed by the harness gate.

Agent and judge defaults (model, reasoning effort) are converter-side and
tunable at convert time; do not encode them in `evals.json`.

## Idempotency for live fixtures

An eval that **mutates shared external state** (a live Confluence page, a
service) is not idempotent: the base run changes the page, so the head run of a
`base`/`head` comparison — and any rerun — starts from a different state and
the two runs are not comparable. Do not let a case depend on a page that a
previous trial already touched. Patterns, strongest first:

1. **Self-seeding copy.** Keep a pristine _seed template_ page that no run
   edits. The prompt makes the agent create its own working copy first
   (Confluence copy → a fresh page under the target folder, unique title, e.g.
   appended date/time), then operate only on that copy. Every run starts from
   the same template; base/head are comparable; runs do not clobber each other.
   Accept that each run leaves a copy behind.
2. **Dedicated page per eval.** Give each case its own fixture page so cases in
   one job do not clobber each other (still not reproducible across reruns).
3. **Operator reseed** between runs — document it; the benchmark itself cannot
   reseed from inside the container.

Site constraints to respect while self-seeding: some Confluence sites enforce
**globally unique page titles across the whole space**, so a copy cannot reuse
the seed's exact title and you must generate a unique one. Rules that depended
on the page title (e.g. a document normalizer dropping a leading H1 that equals
the page title) become conditional once the title is unique: phrase them as
"omits the leading H1 only when it exactly matches the page's title", or the
judge will see correct behaviour as a failure.

## Reference

- Normalizer semantics (skills that bundle one): collapse soft-wrapped prose to
  one logical line per paragraph/table row; keep fenced code, `<details>` /
  admonitions and HTML comments verbatim; drop a leading H1 equal to the page
  title only; verify parity by token stream, ignoring whitespace and blockquote
  markers — Confluence round-trips cosmetic markdown changes.
- Skill layout on disk: `SKILL.md`, `evals/evals.json`, `fixtures/…` (source of
  the `files` entries), `scripts/…`, `harbor/workspace/…`,
  `harbor/prepare.sh`, `harbor/<task-key>/prepare.sh`.
