---
name: jira-magister
description: Project approved DR/SRS and Use Case contracts into a reviewable Jira backlog. Use whenever a user asks to create, decompose, refine, synchronize, or update Jira Epics, User Stories, or technical Tasks from a PRD, DR/SRS, Use Case, JTBD, acceptance check, RFC, or requirements document. Propose multiple cohesive Epics that fit a few sprints, write actor-facing Stories sized for one two-week sprint, separate enabling work into Tasks, preserve source traceability, and require explicit confirmation before Jira mutations.
---

# Jira Magister

Turn validated Use Cases into a Jira execution projection without replacing the
PRD or DR/SRS as the source of truth.

## When to use this skill

Use this skill when the user asks to:

- generate Jira Epics, User Stories, Tasks, or a backlog from a DR/SRS or Use Case;
- split a large DR/SRS into several delivery Epics;
- refine a Jira projection after a Use Case, acceptance check, contract, or
  readiness decision changes;
- synchronize existing Jira items with stable PRD, JTBD, UC, or AC identifiers;
- prepare Jira work for a sprint or ask whether requirements are ready for Jira.

Do not use it to author detailed Use Cases, rewrite the PRD or DR/SRS, decide
unapproved product behavior, or publish Confluence pages. Hand those operations
to the owning skill.

## Source-of-truth and readiness rules

1. Read the parent DR/SRS, its Use Case catalog, each selected Use Case child,
   and the linked PRD/JTBD evidence before drafting Jira items.
2. Treat the DR/SRS as the current operational source of truth. An accepted RFC
   does not guide Jira until its decision is propagated into the DR/SRS.
3. Preserve stable `JTBD-XX`, `UC-XX`, `AC-UC-XX-YY`, `RFC-XX`, and `CR-YYYY-NNN`
   identifiers. Never renumber or reuse an identifier for a different meaning.
4. Check Definition of Ready evidence: PRD owner, outcome, JTBD, KPI, and
   qualitative guardrail; complete `Always` sections; stable Use Case IDs and
   binary acceptance checks; relevant design, contract, privacy, security,
   accessibility, tracking, support, and readiness links or justified `N/A`.
5. If a material criterion is missing, contradictory, or unpropagated, stop Jira
   creation and report the gap, impact, owner if known, and required resolution.
   Do not infer a value to make an item appear ready.

## Workflow

### 1. Collect context

Require:

- parent DR/SRS path or URL;
- selected `UC-XX` IDs or an unambiguous request for all applicable Use Cases;
- linked PRD/JTBD and child Use Case documents;
- Jira project key and target board/context, unless already unambiguous.

Ask one focused clarification at a time when any required context is missing.
Inspect the target Jira project's available issue types and required fields
before assuming that Epic, Story, Task, parent, links, labels, or custom fields
are supported.

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
security controls, deployment, or readiness actions. A Task may support a Story
or Epic but must not masquerade as actor value. A task that cannot fit one sprint
must be split or flagged.

Read [issue-contract.md](./references/issue-contract.md) for required content,
traceability, sizing, and matching rules.

### 4. Review the projection

Show a complete human-readable draft before any Jira mutation:

- proposed Epic, Story, and Task hierarchy;
- summaries and descriptions;
- issue type, parent, dependencies, labels, and project;
- source links and stable IDs;
- acceptance checks, KPI target, qualitative guardrail, and readiness gaps;
- proposed creates, updates, splits, and unchanged items.

Ask for explicit confirmation. A request to “prepare”, “draft”, or “show” the
backlog is not confirmation to create or update Jira.

### 5. Create or synchronize after confirmation

Use the authenticated Atlassian MCP integration when available. If it is not
available, use the repository's `jira-cli` skill and follow its authentication
and command guidance; never silently switch tools.

Create parents before children. For synchronization, match in this order:

1. explicitly supplied Jira key;
2. existing source mapping containing the stable source ID and URL;
3. an exact stable-ID match in the target project;
4. otherwise report ambiguity and stop instead of creating a duplicate.

Update only fields included in the confirmed diff. Do not change lifecycle
status, assignee, priority, estimates, or unrelated description content unless
the user confirmed those changes. Preserve existing Jira content not owned by
this projection.

### 6. Verify and report

Re-fetch every created or updated item and verify:

- parent-child hierarchy and issue types;
- source links and stable IDs;
- Story acceptance checks and Task/Story classification;
- no duplicate was created;
- the returned Jira keys and URLs are usable.

Report partial failures explicitly. Never claim the backlog is synchronized if a
parent, child, link, or verification step failed.

## Clarification rules

- Ask rather than infer actor names, user gains, product outcomes, KPI targets,
  guardrails, ownership, priority, estimates, dependencies, or issue mappings.
- Preserve the exact actor wording from the Use Case's PRD actor catalog.
- Use `N/A — <confirmed reason>` only when the source or user confirms it.
- Record unresolved assumptions and open questions in the draft; do not convert
  them into acceptance criteria.
- Keep Jira as the execution projection. Do not duplicate or rewrite the full
  DR/SRS or Use Case body in every issue.

## Handoff contract

When invoked by `uc-engraver` or `dr-blacksmith`, return the proposed and
confirmed Epic/Story/Task mapping, source IDs, Jira keys and URLs, unresolved
readiness gaps, synchronization results, and any failed verification. Do not
publish Confluence or edit source documents outside this skill's ownership.
