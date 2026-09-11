---
name: jira-magister
description: Project approved DR/SRS and Use Case contracts into a reviewable Jira backlog, and format or persist a single already-specified Jira item. Use whenever a user asks to create, decompose, refine, synchronize, or update Jira Epics, User Stories, or technical Tasks — from a PRD, DR/SRS, Use Case, JTBD, acceptance check, RFC, or requirements document, or from one item the user has already specified. Propose multiple cohesive Epics that fit a few sprints, write actor-facing Stories sized for one two-week sprint, separate enabling work into Tasks, preserve source traceability, and require explicit confirmation before Jira mutations.
---

# Jira Magister

Turn validated Use Cases into a Jira execution projection, or format and persist
a single prepared Jira item, without replacing the PRD or DR/SRS as the source
of truth.

## When to use this skill

Use this skill when the user asks to:

- generate Jira Epics, User Stories, Tasks, or a backlog from a DR/SRS or Use Case;
- split a large DR/SRS into several delivery Epics;
- refine a Jira projection after a Use Case, acceptance check, contract, or
  readiness decision changes;
- synchronize existing Jira items with stable PRD, JTBD, UC, or AC identifiers;
- prepare Jira work for a sprint or ask whether requirements are ready for Jira;
- format and create or update one Jira item the user has already specified,
  without generating a full backlog.

Do not use it to author detailed Use Cases, rewrite the PRD or DR/SRS, decide
unapproved product behavior, or publish Confluence pages. Hand those operations
to the owning skill.

## Entry modes

Pick the mode before collecting context, and ask which one applies when the
request is ambiguous.

- **Backlog mode** — the user has requirements or source documents and needs a
  full projection. Run the [Backlog workflow](#backlog-workflow): slice Epics,
  draft Stories and Tasks, review, then persist. Requires a source of truth and
  passes the Definition of Ready gate.
- **Single-item mode** — the user has already specified one Jira item and wants
  it formatted and created or updated. Run the
  [Single-item workflow](#single-item-workflow). Skip Epic slicing and
  decomposition. The full Definition of Ready gate does not apply; validate
  instead that the item is well formed and that no missing value is invented.

## Source-of-truth and readiness rules

1. Read the parent DR/SRS, its Use Case catalog, each selected Use Case child,
   and the linked PRD/JTBD evidence before drafting Jira items.
2. Treat the DR/SRS as the current operational source of truth. An accepted RFC
   does not guide Jira until its decision is propagated into the DR/SRS.
3. Preserve stable `JTBD-XX`, `UC-XX`, `AC-UC-XX-YY`, `RFC-XX`, and `CR-YYYY-NNN`
   identifiers. Never renumber or reuse an identifier for a different meaning.
   Preserve DR/SRS `open.item-XX` and Use Case `uc-open-XX` question IDs, and the
   semantic error identifiers (`UPPER_SNAKE_CASE`) defined by each Use Case. The
   same semantic error identifier may legitimately appear in several Use Cases
   for the same condition: match by identifier and never duplicate it.
4. Check Definition of Ready evidence: PRD owner, outcome, JTBD, KPI, and
   qualitative guardrail; complete `Always` sections; stable Use Case IDs and
   binary acceptance checks; relevant design, contract, privacy, security,
   accessibility, tracking, support, and readiness links or justified `N/A`.
   For each selected Use Case, require status `ready` on its child page and read
   its `solution.components.*` and `contracts.*` references, its domain entities,
   and its typed errors there. Consume ready children without requiring the
   document review gate.
5. If a material criterion is missing, contradictory, or unpropagated, stop Jira
   creation and report the gap, impact, owner if known, and required resolution.
   Do not infer a value to make an item appear ready.
6. Preserve source traceability in both the issue description and native Jira
   remote links. When a source has a Confluence or Figma URL, link that page or
   design artifact to the Jira item instead of relying only on prose references.
7. Treat open questions as projection input. A question flagged `Blocking: yes`
   becomes an independent spike Task that the dependent Story or Task
   `is blocked by`; a non-blocking question is recorded as a gap with its owner
   and creates no blocking edge. Never invent the answer to an open question.
8. Use the DR/SRS `references.repository` link as the target codebase for
   concrete Tasks. When it is missing, record the gap and flag the Tasks that
   cannot be routed instead of guessing a repository.

In single-item mode, rules 1-2 and 4-5 apply to the supplied item: preserve its
supplied stable IDs and traceability, reject a material omission rather than
invent a value, and do not require an upstream DR/SRS when the item's source is
self-contained.

## Backlog workflow

### 1. Collect context

Require:

- parent DR/SRS path or URL;
- selected `UC-XX` IDs or an unambiguous request for all applicable Use Cases;
- linked PRD/JTBD and child Use Case documents;
- the DR/SRS `Domain model and glossary`, its `references.repository` link, and
  its open questions with their `Blocking` flag;
- the domain entities and typed errors named by each selected Use Case;
- Jira project key and target board/context, unless already unambiguous.

Ask one focused clarification at a time when any required context is missing.
Collect the canonical Confluence URLs for the parent DR/SRS, linked PRD, and
selected Use Case pages, plus applicable Figma URLs, when they are available.

### 2. Propose Epic slices

Propose more than one Epic when the DR/SRS contains separate cohesive outcomes.
Each Epic must:

- represent one outcome or independently valuable capability;
- be completable in a few two-week sprints, not an entire broad initiative;
- list its included `UC-XX` entries, JTBD, KPI outcome, and at least one
  qualitative guardrail;
- state exclusions, dependencies, readiness gaps, and likely delivery risk.

Show the proposed grouping and ask for explicit approval before drafting the
final Stories and Tasks. Do not create or update Jira during this phase.

### 3. Draft Stories and Tasks

Create actor-facing Stories only for observable user value. Use this exact
structure:

> As a [exact Actor name from the Use Case], I want to [observable action], so
> that [user or business gain].

Every Story must be independently deliverable within one two-week sprint. Split
Stories that combine multiple outcomes, actors, or independently testable flows.
Use the Use Case's binary acceptance checks as the Story's acceptance criteria;
preserve their IDs and do not invent missing checks.

Create a technical Task for smaller enabling work such as repository setup,
API/AsyncAPI/Data Contract wiring, migrations, instrumentation, test fixtures,
security controls, deployment, or readiness actions. Route concrete Tasks to the
repository named by `references.repository`. A Task may support a Story or Epic
but must not masquerade as actor value. A task that cannot fit one sprint must be
split or flagged.

Turn blocking open questions into independent spike Tasks. A spike states the
decision to be taken, its owner, its source `open.item-XX`, and the outcome that
unblocks dependents; the dependent Story or Task `is blocked by` the spike. A
non-blocking open question is recorded in the draft as a gap with its owner and
creates no blocking edge. Do not invent the answer to an open question.

Use Case errors may repeat across Use Cases with the same semantic identifier.
Define the error-handling Task once per semantic identifier, not once per Use
Case, keep the identifier in its traceability, and link the affected Stories;
never create duplicate tasks for the same error condition.

Keep hierarchy and dependencies distinct:

- Use the Epic parent relationship for Epic membership, not `blocks`.
- Use a Sub-task for tightly coupled work that does not need independent
  prioritization.
- Use `blocks` from an independent enabling Task to the Story or Task that
  cannot proceed without it; the dependent issue is `is blocked by` the Task.
- Use Story-to-Story or Task-to-Task links only for explicit sequencing or
  delivery dependencies. Do not create speculative or informational links.

Read [issue-contract.md](./references/issue-contract.md) for required content,
traceability, and sizing.

### 4. Review the projection

Show a complete human-readable draft before any Jira mutation:

- proposed Epic, Story, and Task hierarchy;
- summaries and descriptions;
- issue type, parent, dependency links with direction and link type, labels, and
  project;
- source links and stable IDs;
- acceptance checks, KPI target, qualitative guardrail, and readiness gaps;
- spike Tasks derived from blocking open questions, with their `open.item-XX`
  source and the dependents they block;
- the semantic error identifiers and the Stories they affect;
- the repository target and any Task that cannot be routed;
- proposed creates, updates, splits, and unchanged items.

Ask for explicit confirmation. A request to “prepare”, “draft”, or “show” the
backlog is not confirmation to create or update Jira.

### 5. Create or synchronize after confirmation

Read [persistence.md](./references/persistence.md) for the Jira mechanics:
integration selection, project metadata discovery, creation order, native and
remote links, synchronization matching, field-level updates, and failure
handling. Match existing issues before creating new ones, and create parents
before children.

### 6. Verify and report

Re-fetch every created or updated item and verify it against the checklist in
[persistence.md](./references/persistence.md). Report partial failures
explicitly. Never claim the backlog is synchronized if a parent, child, link, or
verification step failed.

## Single-item workflow

Use this mode when the user supplies the item content directly instead of a body
of requirements.

1. **Normalize the item.** Identify its issue type (Epic, Story, or Task),
   project, and parent. Shape it to the portable contract in
   [issue-contract.md](./references/issue-contract.md): the canonical
   `As a [Actor], I want to [action], so that [Gain]` summary for a Story,
   one-sprint scope, binary acceptance checks, the machine-readable source line,
   and any source links. Ask one focused question at a time for any missing
   field; never infer the actor, gain, acceptance checks, parent, project, or
   source ID.
2. **Review the item.** Show the complete item — type, summary, description,
   project, parent, links, labels, source IDs, and acceptance checks — and ask
   for explicit confirmation. A request to "prepare", "draft", or "show" is not
   confirmation.
3. **Persist.** After confirmation, create or update the one item following
   [persistence.md](./references/persistence.md), and attach its source remote
   links.
4. **Verify and report.** Re-fetch the item, verify it against
   [persistence.md](./references/persistence.md), and report its key, URL, and
   any failed step.

The Definition of Ready gate is reduced in this mode: validate that the item is
well formed and that no value is invented. Do not require a parent DR/SRS unless
the source line or a link needs one.

## Clarification rules

- Ask rather than infer actor names, user gains, product outcomes, KPI targets,
  guardrails, ownership, priority, estimates, dependencies, or issue mappings.
- In single-item mode, ask for any missing field rather than inferring it, and
  do not require upstream documents the item does not depend on.
- Preserve the exact actor wording from the Use Case's PRD actor catalog.
- Use `N/A — <confirmed reason>` only when the source or user confirms it.
- Record unresolved assumptions and open questions in the draft; do not convert
  them into acceptance criteria. A blocking question becomes a spike, not a
  guessed value.
- Preserve semantic error identifiers exactly. Deduplicate only identical
  identifiers; never merge two different error conditions into one Task.
- Do not invent a repository, a spike outcome, or the answer to an open question.
- Keep Jira as the execution projection. Do not duplicate or rewrite the full
  DR/SRS or Use Case body in every issue.

## Handoff contract

When invoked by `uc-engraver` or `dr-blacksmith`, return the proposed and
confirmed Epic/Story/Task mapping, including spike Tasks derived from blocking
open questions and deduplicated error-handling Tasks, the repository used,
source IDs, Jira keys and URLs, unresolved readiness gaps, synchronization
results, and any failed verification. In single-item mode, return the created or
updated item, its key and URL, the preserved source line, and any failed step;
no backlog mapping is produced. Do not publish Confluence or edit source
documents outside this skill's ownership.
