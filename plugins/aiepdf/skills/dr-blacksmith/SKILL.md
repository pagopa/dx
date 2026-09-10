---
name: dr-blacksmith
description: Create and update a Design Review / Software Requirements Specification (DR/SRS) from a PRD or discovery material, from a direct task-centric intake when no PRD exists, to turn an accepted RFC into the operational design, after a material decision, or to prepare the document for review.
---

# DR Blacksmith

Create the Design Review / Software Requirements Specification (DR/SRS) that
turns product intent and design evidence into an operational, traceable solution
document. Product, Engineering, Design, control functions, and delivery
stakeholders use it to review feasibility, align system behavior and contracts,
and guide implementation.

## Language

Write the visible content in the language the user is using. Determine it from
the conversation and the user's request, not from this skill, the bundled
template, or the surrounding tooling. For example, if the user writes the
request in Italian, write the DR/SRS in Italian. Only when the language cannot
be inferred at all, default to English unless the user asks for another
language. Stable IDs, status values, endpoint names, metric identifiers, and
other machine-facing values always stay in English and are never translated.

## Scope

Use this skill to create, update, and maintain the DR/SRS: from a PRD,
discovery material, architecture notes, or a direct task-centric intake; after
a material decision, accepted RFC, new dependency, contract, risk, or Use Case;
to prepare the document for review readiness; and to keep it aligned with the
linked PRD, RFC, ADR, API, event, data, security, privacy, and operational
artifacts.

This skill owns only the DR/SRS and its Use Case catalog. `uc-engraver` owns the
`UC-XX` child content.

## Output contract

Produce the DR/SRS as one document using
[`templates/design-review.md`](./templates/design-review.md) as the content
contract, wherever it is stored. The contract is storage-agnostic: it applies
equally to a local file and to a live document in a connected platform. When
the medium or location is unspecified, write a Markdown file to the
user-requested path, or `design-review.md` in the current directory. Treat the
bundled template as a read-only input.

- Preserve stable English IDs exactly as supplied: do not translate, renumber,
  or reuse an ID for a different meaning. Endpoint names, metric identifiers,
  and URLs are machine-facing too.
- Preserve every stable section anchor (`<!-- id: ... -->`) and field/section ID
  exactly as written, even when visible content is translated or reworded.
- Include every `Always` section. Populate each relevant `If applicable`
  section; when the user confirms it does not apply, write
  `N/A — <confirmed reason>`. Mark a conditional block `N/A — <confirmed reason>`
  when its applicability matters for the review; individual non-applicable
  fields may be omitted.
- Start new documents with `metadata.status: draft` and an explicit
  `metadata.canonical-outcome-id`; promote to review or baseline only through
  the readiness gate.
- Keep evidence traceable to its source artifact or stated input.
- Separate confirmed facts, proposed design, assumptions, unresolved questions,
  and decisions.
- Keep detailed flows, edge cases, acceptance checks, and test notes in the Use
  Case child pages; the DR/SRS links the children.
- The PRD is not mandatory: without one, the initiative outcome and scope live
  in the DR/SRS `Expected outcome` section and linked JTBDs are optional.

## Workflow

1. **Collect source material.** Read the linked PRD when present and every
   source the user provides or the PRD links; for a direct task-centric intake,
   start from the most granular reliable artifact (task list, blueprint,
   incident, hardening note) rather than demanding a PRD. Leave no cited source
   unread.
2. **Establish the source of truth.** The current DR/SRS is the operational
   description of confirmed behavior; an RFC is a discussion and decision
   record. Apply an accepted RFC only after its decision is propagated into the
   DR/SRS for the impacted slices, and record the propagation reference.
3. **Map evidence to the template.** Cover context and outcome, solution
   boundaries and components, technology profile, deployment architecture,
   assumptions and trade-offs, non-functional requirements, compliance,
   technical contracts, Use Case index, rollout and rollback, validation,
   monitoring, and readiness. Address every template section: populate it, mark
   it `N/A — <confirmed reason>`, or record it as a gap.
4. **Clarify selectively.** Ask targeted questions about every contradiction or
   missing fact that touches a _material dimension_ — scope, behavior,
   ownership, priority, targets, architecture, compliance, contracts, or
   readiness. Resolve each one or record it as an open question with an owner;
   non-blocking unknowns do not stall the draft.
5. **Resolve identities before writing.** Assign the first free ID in scope for
   new elements; never renumber or reuse an existing ID. A duplicate or
   unresolvable identifier becomes a `possible-duplicate` or a gap, never an
   automatic write.
6. **Write or update the draft.** Use the template and make gaps visible in
   `Open questions, assumptions, decisions, and change propagation`. Every
   material gap carries an owner, and no proposal becomes a confirmed decision
   without evidence or user confirmation.
7. **Operate by lifecycle state.** Before the baseline is approved, missing,
   ambiguous, or contradictory content produces a gap or an open question,
   never a Change Request. After the baseline is approved, a Change Request is
   required only for a material change to behavior, scope, or contracts, per
   DR-07; record the CR ID (`CR-YYYY-NNN`), the affected artifacts, and
   propagation. Materiality and propagation rules live in
   [`references/dr-srs-model.md`](./references/dr-srs-model.md).
8. **Maintain the Use Case index.** Keep the catalog link-first: add stable
   `UC-XX` entries with title, source artifact, linked JTBD (or
   `N/A — no linked PRD`), priority, status/gap, and a link to the child page.
   When the user asks for detailed Use Cases, invoke `uc-engraver` with the
   existing parent DR/SRS and source artifacts, then fold its returned child
   path, stable ID, and unresolved gaps into the index. Write no child bodies
   and leave no index entry out of sync.
9. **Validate and gate readiness.** Apply
   [`references/validation-checklist.md`](./references/validation-checklist.md);
   every item is satisfied or recorded as a gap with an owner. Change
   `metadata.status` only when the user explicitly requests review readiness
   and the document has enough context, owner, scope, solution, and evidence to
   be meaningfully reviewed; otherwise keep `draft` and identify the blockers.

## Clarification rules

- Ask rather than infer any material dimension.
- Preserve competing designs and contradictions until the decision owner
  resolves them.
- Record missing inputs as open questions, assumptions, or justified `N/A`;
  never fill gaps with plausible technical detail.
- Treat an `accepted` RFC as historical until its decision is visible in the
  DR/SRS; an unpropagated RFC does not guide implementation.
- Link existing contracts and reviews instead of copying their contents.
- Keep the DR/SRS concise enough to govern the system; behavior-level detail
  belongs to `uc-engraver`.
- A privacy or security gap blocks the production launch, not the drafting of
  the document.
- Every material gap carries an owner.

## References

Read [`references/dr-srs-model.md`](./references/dr-srs-model.md) when updating
an existing document, handling RFC propagation, or determining the Definition
of Ready. Apply
[`references/validation-checklist.md`](./references/validation-checklist.md)
before changing review status.
