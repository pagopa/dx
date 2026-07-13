---
name: prd-alchemist
description: Write and update a structured Product Requirements Document (PRD) from gathered product material. Use when a product manager wants to turn discovery notes, meeting summaries, strategy input, or a rough product document into a Confluence-compatible PRD covering needs, actors, JTBD, goals, metrics, guardrails, dependencies, constraints, feasibility red flags, design discovery, open questions, and support readiness. Preserve stable English IDs, manage explicit draft-to-review readiness, and offer optional Confluence publication only after writing.
---

# PRD Alchemist

Turn gathered product material into a structured, outcome-oriented Product
Requirements Document (PRD).

The PRD explains the need, intended outcomes, constraints, and early feasibility
signals. It is outcome-oriented and does not replace downstream use cases,
technical specifications, acceptance criteria, QA checklists, or implementation
plans.

## When to Use This Skill

Use this skill when the user wants to:

- turn gathered product material into a structured PRD;
- rewrite or update an existing PRD using the canonical hierarchy;
- fill gaps in a product document through a guided interview;
- prepare a PRD that can later be published to Confluence.

The preferred input is the output of a gathering phase plus any strategic
documents, notes, links, or decisions available. If the user starts with less,
ask for the missing information rather than inventing it.

## Output Contract

Produce one PRD using [`templates/prd.md`](./templates/prd.md). Write it to the
path requested by the user, or to `prd.md` in the current working directory when
no path is given. Never overwrite the bundled template.

- Write the document in **English** unless the user explicitly requests another
  language for the visible content.
- Include the visible `Metadata` section from the template and set
  `metadata.status` to `draft` when creating or updating the PRD.
- Preserve every stable ID exactly as written. IDs are always English and are
  never translated, including in a translated Confluence page.
- Include every template section. For conditional sections, use
  `Not applicable — <confirmed reason>` when the user confirms they do not
  apply; never silently remove a section.
- Keep concrete facts traceable to source inputs.
- Do not advance the status without the explicit confirmation described below or
  create downstream use cases, backlog items, or implementation specifications.

## Workflow

1. **Collect the writing inputs.** Read the gathered material, strategic input,
   existing product documents, linked artifacts, and confirmed decisions. Ask
   for referenced material that has not been provided.
2. **Map evidence to the template.** Organize the input under Metadata, Need
   definition, Actors, Objectives, Success metrics, Strategic dependencies,
   Context and constraints, Initial feasibility red flags, Design discovery,
   Open questions, and Support readiness. Distinguish confirmed facts,
   proposals, assumptions, and unresolved questions.
3. **Clarify selectively.** Ask targeted questions for contradictions, missing
   ownership, unclear problem statements, unsupported metrics, or decisions that
   affect scope, priority, outcomes, or feasibility. Do not block creation of a
   `draft` solely because a conditional field is unknown; record the unknown as
   an open question or justified `Not applicable` value.
4. **Write or update the PRD.** Rewrite confirmed material into clear,
   outcome-oriented language. Every JTBD row must include persona, canonical job
   statement, expected outcome, success metric, quality guardrail, priority, and
   notes. Keep detailed use cases and implementation content out of the PRD.
5. **Validate the document.** Confirm that every stable section and field ID is
   present, status is valid, confirmed values are traceable, conditional sections
   are populated or explicitly marked not applicable, and authoring guidance is
   removed.
6. **Handle explicit review readiness.** If the user says the PRD is complete,
   good enough, or ready for review, verify that context, sponsor, owner, and
   problem are clear enough to request stakeholder feedback. Non-blocking open
   questions may remain. If the criterion is met, change only
   `metadata.status` from `draft` to `review`; otherwise keep `draft` and ask
   targeted questions. Never infer this transition.
7. **Offer Confluence publication.** After writing a new PRD, ask:
   **"Do you want me to create a Confluence page for this PRD?"** Do not publish
   without an affirmative answer. When handling a status-only completion
   request, do not offer publication unless the user separately asks for it.
8. **Ask the publication language.** If the user says yes, ask which language
   the Confluence page should use. Then follow
   [`references/confluence-publication.md`](./references/confluence-publication.md).

## Clarification Rules

- **Ask, never infer.** Do not turn a suggestion into a decision, create
  metrics, choose scope, assign ownership, or resolve contradictions yourself.
- **Drafts may be incomplete.** Missing information belongs in open questions,
  assumptions, or a justified `Not applicable` value. Do not invent a value to
  make the document look complete.
- **Change status only on explicit confirmation.** Keep `metadata.status` as
  `draft` unless the user explicitly confirms that the PRD is complete, good
  enough, or ready for review. If blockers remain, keep `draft` and ask about
  them instead.
- **Keep review blockers distinct.** Only missing context, sponsor, owner, or a
  sufficiently clear problem blocks `draft → review`; other open questions can
  remain visible in the PRD.
- **Preserve competing positions.** When sources disagree, state the
  contradiction in the clarification question and ask the decision owner to
  resolve it.

## Stable IDs and Human Readability

The document is prose-first for people and structurally reliable for agents:

- HTML comments before headings are stable section IDs.
- The `ID` column in tables contains stable field or row IDs, including metadata
  fields such as `metadata.status`.
- IDs never change between revisions, even if visible headings are translated
  or reworded.
- Keep metadata visible in the Markdown section; do not move it to YAML
  frontmatter or another hidden representation.

Treat IDs as a contract. Add a new ID only for a genuinely new field; never
reuse an existing ID for a different meaning.

## Boundaries

- Do not perform gathering-only aggregation when the user asks for a structured
  PRD.
- Do not manage statuses beyond `draft` and `review`.
- Do not publish or change lifecycle state without explicit user confirmation.
- Do not include detailed use cases, technical specifications, QA, rollout,
  backlog, or implementation content inside the PRD; keep those details in
  downstream artifacts instead.
