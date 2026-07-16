---
name: dr-blacksmith
description: Create and update a structured Design Review / Software Requirements Specification (DR/SRS). Use whenever a user asks for a Design Review, DR, SRS, solution design, technical requirements document, architecture review, or to turn an accepted RFC into the operational design. Write Markdown first, preserve stable IDs, expose gaps without inventing decisions, invoke uc-engraver when detailed Use Cases are requested, and hand confirmed Confluence publication to the confluence-librarian skill.
---

# DR Blacksmith

Create the Design Review / Software Requirements Specification (DR/SRS) that
turns product intent and design evidence into an operational, traceable solution
document. Product, Engineering, Design, control functions, and delivery
stakeholders use it to review feasibility, align system behavior and contracts,
and guide implementation.

## When to use this skill

Use this skill to:

- create a DR/SRS from a PRD, discovery material, architecture notes, or a
  task-centric intake;
- update the current solution design after a material decision, accepted RFC,
  new dependency, contract, risk, or Use Case;
- prepare a Design Review document for stakeholder review or readiness;
- keep a DR/SRS aligned with linked PRD, RFC, ADR, API, event, data, security,
  privacy, and operational artifacts.

Do not use it to generate individual Use Case child documents. A separate skill
owns the `UC-XX` content. This skill creates and maintains only the DR/SRS Use
Case catalog.

## Output contract

Produce one Markdown document using
[`templates/design-review.md`](./templates/design-review.md). Write it to the
user-requested path, or `design-review.md` in the current directory when no path
is given. Never overwrite the bundled template.

- Write visible content in English unless the user explicitly requests another
  language.
- Preserve stable English IDs exactly as supplied. Do not translate or reuse an
  ID for a different meaning.
- Include every `Always` section. For a relevant `If applicable` section,
  populate it; when the user confirms it does not apply, write
  `N/A — <confirmed reason>`.
- Start new documents with `metadata.status: draft`. Do not silently promote
  the document to review or approved.
- Keep evidence traceable to its source artifact or stated input.
- Distinguish confirmed facts, proposed design, assumptions, unresolved
  questions, and decisions.
- Keep detailed flows, edge cases, acceptance checks, and test notes in the
  Use Case documents. Do not recreate them in the DR/SRS.

## Workflow

1. **Collect source material.** Read the linked PRD and any other source provided
   by user or linked in the PDR.
2. **Establish the source of truth.** Treat the current DR/SRS as the
   operational description of confirmed behavior. An RFC is a discussion and
   decision record, not an operational instruction. Apply an accepted RFC only
   after its decision is propagated into the DR/SRS; record the propagation
   reference.
3. **Map evidence to the template.** Cover context and outcome, solution
   boundaries and components, deployment architecture, assumptions and
   trade-offs, non-functional requirements, compliance, technical contracts,
   Use Case index, rollout and rollback, validation, monitoring, and readiness.
4. **Clarify selectively.** Ask targeted questions for contradictions or
   missing information that affects scope, behavior, ownership, architecture,
   compliance, contracts, or readiness. Do not block a draft merely because
   non-blocking information is unknown.
5. **Write or update the draft.** Use the template and make gaps visible in
   `Open questions, assumptions, and decisions`. Never convert a proposal into
   a confirmed decision without evidence or user confirmation.
6. **Maintain the Use Case index.** Add stable `UC-XX` entries with title,
   linked JTBD, priority, and status. Flag missing or stale Use Case documents
   for the Use Case skill; do not write their bodies.
7. **Validate the document.** Apply
   [`references/validation-checklist.md`](./references/validation-checklist.md).
8. **Handle review readiness explicitly.** Change `metadata.status` only when
   the user explicitly requests review readiness and the document has enough
   context, owner, scope, solution, and evidence to be meaningfully reviewed.
   Otherwise keep `draft` and identify the blockers. Apply the validation
   checklist before changing status.
9. **Offer publication.** After writing and validating the local file, ask
   whether the user wants a Confluence page. Once the user confirms, hand the
   prepared document and its domain constraints to the `confluence-librarian`
   skill. Apply the validation checklist before handoff. Do not publish directly
   or duplicate its destination-resolution, translation, confirmation, or
   Confluence API workflow.

## Clarification rules

- Ask rather than infer ownership, scope, priority, targets, architecture
  choices, compliance outcomes, or readiness decisions.
- Preserve competing designs and contradictions until the decision owner
  resolves them.
- Record missing inputs as open questions, assumptions, or justified `N/A`;
  never fill gaps with plausible technical detail.
- Treat `accepted` RFCs as historical until their decision is visible in the
  DR/SRS. An RFC that has not been propagated must not guide implementation.
- Link existing contracts and reviews instead of copying their full contents.
- Keep the DR/SRS concise enough to govern the system; delegate
  behavior-level detail to the Use Case skill.

## References

Read [`references/dr-srs-model.md`](./references/dr-srs-model.md) when
updating an existing document, handling RFC propagation, or determining
Definition of Ready.

Apply
[`references/validation-checklist.md`](./references/validation-checklist.md)
before changing review status or handing the document off for publication.
