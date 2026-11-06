---
name: uc-engraver
description: Create, update, and propose structured Use Case child documents for a parent Design Review / Software Requirements Specification (DR/SRS) stored locally or in Confluence. Use whenever a user asks to define, write, refine, propose, synchronize, or publish a Use Case, UC, scenario, acceptance checks, or detailed behavior from a PRD, DR/SRS, JTBD, Service Blueprint, Figma, RFC, contract, or task intake. Preserve stable UC/AC IDs, reuse actor names exactly from the linked PRD, keep proposals lightweight until a human accepts them, expose gaps without inventing behavior, update and verify the parent catalog, and hand confirmed Confluence publication to confluence-librarian.
---

# UC Engraver

Forge the detailed Use Case child document that makes one behavior
implementable, testable, and traceable without duplicating the parent DR/SRS.

## When to use this skill

Use this skill to:

- create one or more Use Cases from a parent DR/SRS, linked PRD, JTBD,
  Service Blueprint, Figma flow, RFC, contract, or task intake;
- propose a Use Case that the parent owner has not accepted yet;
- update an existing Use Case after a confirmed behavior, contract, tracking,
  compliance, or acceptance change;
- add a Use Case while `dr-blacksmith` is authoring or updating a parent DR/SRS;
- synchronize a Use Case child with its parent DR/SRS catalog.

Do not use it to create a new parent DR/SRS. If the parent document cannot be
located, ask for its path or URL and stop. Do not embed detailed Use Case bodies
in the parent document.

## Language

Write the visible content in the language the user is using. Determine it from
the conversation and the user's request, not from this skill, the bundled
template, or the surrounding tooling. For example, if the user writes the
request in Italian, write the Use Case in Italian. Only when the language cannot
be inferred at all, default to English unless the user asks for another language.
Stable IDs, status values, endpoint names, metric identifiers, error
identifiers, URLs, and acceptance-check IDs always stay in English and never get
translated.

## Output contract

Write one child document per selected Use Case using
[`templates/use-case.md`](./templates/use-case.md), and never overwrite the
bundled template. The contract is storage-agnostic: it applies equally to a
local Markdown file and to a Confluence child page.

- **Local parent**: write `use-cases/uc-XX-<slug>.md` relative to the parent
  DR/SRS directory, unless the user requests another path.
- **Confluence parent** (page URL or content ID): author the child body, then
  publish it as a child page through `confluence-librarian` after confirmation.
  Do not create a `use-cases/` tree for a document that lives only in
  Confluence.

- When the user requests all Use Cases in a parent catalog, create or update
  every selected catalog entry.
- Preserve the existing `UC-XX` ID when updating. Allocate the next
  non-conflicting ID only for a genuinely new Use Case.
- Preserve existing Use Case-local `AC-XX` IDs when their meaning remains
  unchanged. Add a new ID only for new acceptance meaning; do not renumber
  existing checks.
- Keep the frontmatter `status` unchanged unless the user explicitly requests a
  transition. `draft` means identified and being detailed; `ready` means
  implementable and consumable by the backlog; `retired` means rejected or
  withdrawn, kept for traceability with its ID never reused and never projected
  to the backlog. A promotion is proposed with evidence and confirmed by a human
  reviewer; never apply it autonomously.
- Keep the proposal attribution in the frontmatter: `proposed_by` names who
  proposes the behavior, `owner` names who owns and approves the Use Case.
- Define the Use Case's typed errors locally with stable semantic identifiers
  and no owner; never centralize an error taxonomy in the DR/SRS.
- Keep every unknown, contradiction, and unverified claim visible as an
  assumption, open question, proposed value, or justified `N/A`.
- A published child Use Case is not complete until the parent Confluence
  catalog row contains both the child link and the returned Confluence URL.
  Treat the parent update and its verification as part of publication, not as
  optional follow-up work.

## Proposal mode

A proposal is a Use Case that someone other than the parent owner suggests, from
a Call for Task, a task intake, or an explicit request to propose. It enters the
parent catalog like any other Use Case and stays `draft`; the reduced body is the
contract, not an unfinished job.

- Fill only what the proposal supports: stable ID, title, priority, source
  artifact, `proposed_by`, `owner`, trigger, main flow, and at least one binary
  acceptance check on a `Must` Use Case.
- Leave typed errors, tracking events, component and contract references, and
  the sequence diagram as an open question or a justified gap. Never invent
  them to make the body look complete.
- A proposal never becomes `ready` and never enters the backlog on its own.
- When a human accepts the proposal, complete the body as a normal update. When
  a human rejects or withdraws it, set `status: retired` and keep the document.

## Source and actor discipline

1. Read the parent DR/SRS and its linked PRD before writing.
2. Treat the linked PRD actor catalog as authoritative. Copy actor names
   exactly, including capitalization, punctuation, singular/plural form, and
   qualifiers. Do not translate, normalize, or substitute an actor name.
3. Reuse the parent DR/SRS `UC-XX` IDs, titles, and child links; take the
   linked JTBD, priority, and evidence from the PRD and the parent's
   architecture and contract sections. Treat conflicts with the PRD, DR/SRS,
   Service Blueprint, Figma, RFC, or contracts as open questions; do not
   silently reconcile them.
4. Use accepted RFC decisions only after they have been propagated into the
   parent DR/SRS.
5. Present proposed behavior as proposed in the section it affects; the behavior
   becomes confirmed only when a human accepts the proposal.

Cite source titles/keys and links, not opaque source codes alone. Distinguish
product actors from the Copilot interlocutor and attribute decisions only to
evidenced owners. Describe behavior directly, without chat or tool narratives;
retain precise flows, typed errors, and acceptance checks.

## Required Use Case structure

Complete every section in the bundled template, or the reduced body described in
[Proposal mode](#proposal-mode) when the Use Case is a proposal:

- stable ID, status, priority, `proposed_by`, `owner`, and parent DR/SRS metadata;
- linked JTBD;
- primary and secondary actors;
- source artifact, including Call for Task when applicable;
- Service Blueprint step;
- domain entities touched, by name from the parent `Domain model and glossary`;
- trigger and preconditions;
- main, alternate, and exception/edge-case flows;
- postconditions;
- typed errors with stable semantic identifiers and no owner;
- numbered binary acceptance checks local to the Use Case;
- tracking events;
- the `solution.components.*` and `contracts.*` IDs the Use Case touches, or a
  justified `N/A`;
- relevant Service Blueprint, Figma, endpoint/contract, validation, and
  sequence-diagram references.

Keep these body fields in the same order as the DR-01 Use Case template so the
Markdown maps predictably to Confluence. A sequence diagram may be inline
Mermaid/PlantUML or a link to a repository diagram.

The child document owns behavior-level detail. The parent owns the catalog and
cross-Use Case architecture, NFRs, contracts, rollout, validation strategy,
readiness, and change propagation.

## Workflow

1. **Locate the parent.** Find the existing parent DR/SRS — a local path, or a
   Confluence page URL or content ID — and read its complete Use Case index. If
   the parent cannot be located, ask for its path or URL and stop.
2. **Collect evidence.** Read the linked PRD actor catalog, JTBD, Service
   Blueprint, Figma, RFC/ADR, APIs/events/data contracts, the parent
   `Domain model and glossary`, tracking registry, reviews, tests, and supplied
   task context. Ask only about contradictions or missing decisions that affect
   behavior, ownership, contracts, compliance, tracking, or readiness.
3. **Select catalog entries.** Match a requested `UC-XX` by ID or unambiguous
   title. When the user requests all Use Cases, select every applicable parent
   catalog entry. For a genuinely new Use Case, allocate the next available
   stable ID without renumbering existing entries.
4. **Draft or update each child.** Fill the complete template, or the reduced
   proposal body, for every selected entry. Reuse PRD actor names exactly,
   preserve stable IDs, name the domain entities it touches, define its typed
   errors with semantic identifiers, and distinguish confirmed behavior from
   proposed behavior, assumptions, and open questions.
5. **Validate each child.** Check that flows are coherent, acceptance checks are
   binary and traceable, tracking is explicit or justified `N/A`, a sequence
   diagram is supplied inline or by link, links and IDs are consistent, errors
   use semantic identifiers and each exception flow references one, open
   questions do not repeat a parent `open.item-XX`, and no unsupported decision
   was invented. For a proposal, check instead that every unsupported section is
   an explicit gap and that no invented error, tracking event, or contract
   reference fills it.
6. **Synchronize the parent.** Update every selected row in the existing parent
   DR/SRS Use Case index in the same workflow. The parent row is only the stable
   ID, the title, and the child-document link; keep those aligned and keep
   status, priority, JTBD, components, contracts, and behavior out of the
   catalog. Name the parent's `solution.components.*` and `contracts.*` IDs
   inside the child and report any the parent is missing instead of inventing
   them.
7. **Record propagation.** When a Use Case changes confirmed behavior,
   contracts, tracking, privacy/security, or acceptance checks, update the
   parent open-question/decision propagation area when the change requires
   coordination, and identify affected downstream artifacts without editing
   artifacts owned by another skill.
8. **Handle a proposal decision.** When a human accepts a proposal, complete the
   body and clear the proposal gaps. When a human rejects or withdraws it, set
   `status: retired` and leave the record in place.
9. **Offer publication.** After the child and the parent catalog are valid, ask
   whether the user wants a Confluence child page. After confirmation, hand the
   child source, parent page context, title, operation, language, and
   preservation constraints to `confluence-librarian`. Do not publish directly.
   Keep the child link and the returned Confluence URL in the parent catalog.
   When the parent catalog is itself published, ensure the Confluence parent
   page is updated and re-fetched so it no longer contains `TBD` or
   missing-child placeholders. If that synchronization fails, report publication
   as incomplete rather than claiming success.

## Clarification rules

- Ask rather than infer actors, JTBD links, priority, ownership, behavior,
  targets, contracts, tracking, or approval/lifecycle status.
- Ask whether the Use Case is a proposal or accepted behavior when the source
  does not say; treat it as a proposal until a human confirms acceptance.
- Prefer an explicit open question over a plausible flow or acceptance check.
- Prefer a semantic error identifier over a numeric one; an error carries no
  owner.
- Do not repeat a parent open question: reference its `open.item-XX`. Put
  cross-Use-Case or initiative questions in the parent document.
- Use `N/A — <confirmed reason>` only when the source or user confirms that a
  section does not apply.
- Set `retired` only on an explicit rejection or withdrawal.
- Do not turn a user story into a Use Case without defining the observable
  trigger, system behavior, outcomes, and binary acceptance checks.
- Do not duplicate detailed child content in the parent DR/SRS.

## Direct and delegated invocation

When invoked directly, own the complete child-authoring and parent-sync
workflow. When invoked by `dr-blacksmith`, return every created or updated child
path, stable ID, status, parent index change, unresolved gap, and Confluence URL
so `dr-blacksmith` can continue the parent document workflow. For a proposal,
return the pending decision explicitly so the parent owner can accept or reject
it. For published children, also return the verified parent-page URL and the
synchronized row state.
