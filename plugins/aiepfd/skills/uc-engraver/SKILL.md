---
name: uc-engraver
description: Create and update structured Use Case child documents for a parent Design Review / Software Requirements Specification (DR/SRS). Use whenever a user asks to define, write, refine, or synchronize a Use Case, UC, scenario, acceptance checks, or detailed behavior from a PRD, DR/SRS, JTBD, Service Blueprint, Figma, RFC, contract, or task intake. Preserve stable UC/AC IDs, reuse actor names exactly from the linked PRD, expose gaps without inventing behavior, update the parent DR/SRS catalog, and hand confirmed Confluence publication to confluence-librarian.
---

# UC Engraver

Forge the detailed Use Case child document that makes one behavior
implementable, testable, and traceable without duplicating the parent DR/SRS.

## When to use this skill

Use this skill to:

- create one or more Use Cases from a parent DR/SRS, linked PRD, JTBD,
  Service Blueprint, Figma flow, RFC, contract, or task intake;
- update an existing Use Case after a confirmed behavior, contract, tracking,
  compliance, or acceptance change;
- add a Use Case while `dr-blacksmith` is authoring or updating a parent DR/SRS;
- synchronize a Use Case's local child document and its parent DR/SRS catalog.

Do not use it to create a new parent DR/SRS. If the parent document cannot be
located, ask for its path and stop. Do not embed detailed Use Case bodies in
the parent document.

## Output contract

Write one Markdown file per Use Case at
`use-cases/uc-XX-<slug>.md`, relative to the parent DR/SRS directory, unless
the user explicitly requests another path. Use
[`templates/use-case.md`](./templates/use-case.md) and never overwrite the
bundled template.

- Preserve the existing `UC-XX` ID when updating. Allocate the next
  non-conflicting ID only for a genuinely new Use Case.
- Preserve existing `AC-*` IDs when their meaning remains unchanged. Add a
  new ID only for new acceptance meaning; do not renumber existing checks.
- Write visible content in English unless another language is requested.
  Stable IDs, status values, endpoint names, metric identifiers, and URLs are
  machine-facing and remain unchanged.
- Keep `metadata.status` and the Use Case lifecycle status unchanged unless the
  user explicitly requests a lifecycle transition.
- Keep every unknown, contradiction, and unverified claim visible as an
  assumption, open question, proposed value, or justified `N/A`.

## Source and actor discipline

1. Read the parent DR/SRS and its linked PRD before writing.
2. Treat the linked PRD actor catalog as authoritative. Copy actor names
   exactly, including capitalization, punctuation, singular/plural form, and
   qualifiers. Do not translate, normalize, or substitute an actor name.
3. Reuse the parent DR/SRS `UC-XX` catalog, linked JTBD IDs, priorities, and
   known links. Treat conflicts with the PRD, DR/SRS, Service Blueprint, Figma,
   RFC, or contracts as open questions; do not silently reconcile them.
4. Use accepted RFC decisions only after they have been propagated into the
   parent DR/SRS.

## Required Use Case structure

Complete every section in the bundled template:

- stable ID and title;
- linked JTBD and priority;
- primary and secondary actors;
- source artifact and Service Blueprint step when applicable;
- design maturity, trigger, and preconditions;
- main, alternate, and exception/edge-case flows;
- postconditions;
- numbered binary acceptance checks;
- tracking events;
- links to diagrams, Figma, endpoints/contracts, and validation evidence.

The child document owns behavior-level detail. The parent owns the catalog and
cross-Use Case architecture, NFRs, contracts, rollout, validation strategy,
readiness, and change propagation.

## Workflow

1. **Locate the parent.** Find the existing parent DR/SRS and read the complete
   Use Case index. If no parent path is available, ask for it and stop.
2. **Collect evidence.** Read the linked PRD actor catalog, JTBD, Service
   Blueprint, Figma, RFC/ADR, APIs/events/data contracts, tracking registry,
   reviews, tests, and supplied task context. Ask only about contradictions or
   missing decisions that affect behavior, ownership, contracts, compliance,
   tracking, or readiness.
3. **Choose the identity.** Match an existing `UC-XX` by ID or unambiguous
   title. For a new Use Case, allocate the next available stable ID without
   renumbering existing entries.
4. **Draft or update the child.** Fill the complete template. Reuse PRD actor
   names exactly, preserve stable IDs, and distinguish confirmed behavior from
   proposed behavior, assumptions, and open questions.
5. **Validate the child.** Check that flows are coherent, acceptance checks are
   binary and traceable, tracking is explicit or justified `N/A`, links and
   IDs are consistent, and no unsupported decision was invented.
6. **Synchronize the parent.** Update the existing parent DR/SRS Use Case
   index in the same workflow. Keep the row's ID, title, linked JTBD,
   priority, child-document link, and status/gap aligned. Preserve the
   parent's catalog-only boundary.
7. **Record propagation.** When the Use Case changes confirmed behavior,
   contracts, tracking, privacy/security, or acceptance checks, update the
   parent open-question/decision propagation area when the change requires
   coordination, and identify affected downstream artifacts without editing
   artifacts owned by another skill.
8. **Offer publication.** After the local child and parent are valid, ask
   whether the user wants a Confluence child page. After confirmation, hand
   the child source, parent page context, title, operation, language, and
   preservation constraints to `confluence-librarian`. Do not publish directly.
   Keep both the local Markdown link and the returned Confluence URL in the
   parent catalog.

## Clarification rules

- Ask rather than infer actors, JTBD links, priority, ownership, behavior,
  targets, contracts, tracking, or approval/lifecycle status.
- Prefer an explicit open question over a plausible flow or acceptance check.
- Use `N/A — <confirmed reason>` only when the source or user confirms that a
  section does not apply.
- Do not turn a user story into a Use Case without defining the observable
  trigger, system behavior, outcomes, and binary acceptance checks.
- Do not duplicate detailed child content in the parent DR/SRS.

## Direct and delegated invocation

When invoked directly, own the complete child-authoring and parent-sync
workflow. When invoked by `dr-blacksmith`, return the created or updated child
path, stable ID, parent index changes, unresolved gaps, and any Confluence URL
so `dr-blacksmith` can continue the parent document workflow.
