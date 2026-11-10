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
  passes the Definition of Ready gate in
  [issue-contract.md](./references/issue-contract.md).
- **Single-item mode** — the user has already specified one Jira item and wants
  it formatted and created or updated. Run the
  [Single-item workflow](#single-item-workflow). Skip Epic slicing and
  decomposition; use the single-item readiness gate in
  [issue-contract.md](./references/issue-contract.md).

## Source-of-truth and readiness rules

Treat the DR/SRS as the current operational source of truth. Apply readiness,
stable-ID, question, error, and repository-routing rules in
[issue-contract.md](./references/issue-contract.md). Use
[issue-template.md](./references/issue-template.md) for the execution contract,
source selection, and description structure.

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

Read these sources before drafting. Ask one focused clarification at a time
when required context is missing. Collect the locators needed by
[issue-template.md](./references/issue-template.md).

### 2. Propose Epic slices

Propose more than one Epic when the DR/SRS contains separate cohesive outcomes.
Each Epic proposal must:

- follow the outcome and sizing rules in
  [issue-contract.md](./references/issue-contract.md);
- list its included `UC-XX` entries, JTBD, KPI outcome, and at least one
  qualitative guardrail;
- link the DR, PRD and included UCs in the review context so grouping evidence
  stays traceable;
- state exclusions, dependencies, readiness gaps, and likely delivery risk.

Show the proposed grouping and ask for explicit approval before drafting the
final Stories and Tasks. Do not create or update Jira during this phase.
Keep grouping evidence in the review proposal; use the template's minimal
Epic format for persistence.

### 3. Draft Stories and Tasks

Draft actor-facing Stories and enabling Tasks from the approved sources. Apply
[issue-contract.md](./references/issue-contract.md) for issue content, sizing,
decomposition, dependencies, readiness, and routing; use
[issue-template.md](./references/issue-template.md) for the execution contract
and source formatting.

### 4. Review the projection

Show a complete human-readable draft before any Jira mutation:

- proposed Epic, Story, and Task hierarchy;
- summaries and descriptions;
- issue type, parent, dependency links with direction and link type, labels, and
  project;
- complete `Source` blocks, primary documents, nested IDs, and AC Coverage;
- missing locators and whether Confluence ID anchors are known to exist;
- execution details required by the template for dispatchable items;
- KPI, guardrail and readiness evidence in the grouping proposal;
- spike and error-handling Tasks with their affected items;
- the repository target and any Task that cannot be routed;
- proposed creates, updates, splits, and unchanged items.

Run [draft validation](#draft-validation) before saving or presenting it, then
use the confirmation protocol in [persistence.md](./references/persistence.md).

### 5. Create or synchronize after confirmation

Read [persistence.md](./references/persistence.md) for integration selection,
project metadata discovery, creation order, links, synchronization matching,
field-level updates, and failure handling.

### 6. Verify and report

Follow the verification and failure-handling requirements in
[persistence.md](./references/persistence.md), then return the
[handoff contract](#handoff-contract).

## Single-item workflow

Use this mode when the user supplies the item content directly instead of a body
of requirements.

1. **Normalize the item.** Extract the supplied issue fields: type, summary,
   project, parent and execution information. Separately extract document titles
   and locators into Source; they are evidence labels, not alternative issue
   summaries. Validate against [issue-contract.md](./references/issue-contract.md)
   and [issue-template.md](./references/issue-template.md). Ask one focused
   question at a time for any missing field. If evidence conflicts with a
   supplied missing-locator statement, report the candidate and conflict as a
   gap; do not promote the candidate into the authoritative Source before
   clarification.
2. **Review the item.** Show the complete item — type, summary, description,
   project, parent, links, labels, sources and execution contract. Run
   [draft validation](#draft-validation) on this item only, including when
   required information is missing, then use the confirmation protocol in
   [persistence.md](./references/persistence.md).
3. **Persist.** After confirmation, create or update the one item following
   [persistence.md](./references/persistence.md).
4. **Verify and report.** Follow the verification and failure-handling
   requirements in [persistence.md](./references/persistence.md), then return
   the [handoff contract](#handoff-contract).

## Draft validation

Compare the completed draft with the supplied input before saving or presenting
it. Missing execution information blocks persistence, not this comparison:

- Match each Task/Bug/Sub-task summary, project, parent and supplied execution
  field to the input. Preserve an explicit work summary verbatim; source titles
  label Source documents and do not replace issue summaries.
- For a Story, check the literal summary structure in the contract and the
  exact actor name separately.
- Compare every source locator with its evidence: hostname, page ID,
  repository/branch and Figma node. Apply only the template's canonicalization,
  never reconstruct a URL from memory. Check each nested ID's rendering against
  its parent locator.
- Check that execution details satisfy the template and describe the same local
  deliverable. Keep missing required fields visible as gaps.

Correct discrepancies before requesting confirmation. Apply the same checks to
saved proposals; a conversational disclaimer does not repair the saved draft.
When required information is missing, name it in the saved status and state that
persistence is blocked until it is supplied. "Not persisted" or "pending" alone
describes what has happened, not the condition preventing the next operation.
End both the saved proposal and conversational handoff with the next question:
ask for the missing required information when blocked; otherwise explicitly ask
the user to confirm the proposed operation and items. A pending-confirmation
status is not itself a confirmation request.

## Clarification rules

- Ask rather than infer actor names, user gains, product outcomes, KPI targets,
  guardrails, ownership, priority, estimates, dependencies, or issue mappings.
- Preserve the exact actor wording from the Use Case's PRD actor catalog.
- Use `N/A — <confirmed reason>` only when the source or user confirms it.
- Keep Jira as the execution projection. Do not duplicate or rewrite the full
  DR/SRS or Use Case body in every issue.

## Handoff contract

When invoked by `uc-engraver` or `dr-blacksmith`, return the proposed and
confirmed Epic/Story/Task mapping, repository, source IDs, Jira keys and URLs,
readiness gaps, synchronization results, and any failed verification. In
single-item mode, return the created or updated item, its key and URL, its
`Source` and AC Coverage blocks, and any failed step; no backlog mapping is
produced. Include the dispatchable item's execution details and supplied
correlation ID so its execution boundary remains visible.

For review-only work, state in both the saved proposal and conversational
handoff that it is not persisted and that confirmation, persistence, and
post-mutation verification are still pending.
