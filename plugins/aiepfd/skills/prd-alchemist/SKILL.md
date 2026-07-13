---
name: prd-alchemist
description: Write a structured Product Requirements Document (PRD) from gathered product material. Use when a product manager wants to turn discovery notes, a rough PRD, meeting summaries, strategy input, or a collection-phase output into a complete product requirements document. Map the input to the canonical Why, What, How, and Project management hierarchy; ask targeted questions until mandatory gaps and contradictions are resolved; preserve stable English machine-readable IDs; keep status "draft"; and offer optional Confluence publication only after the PRD is written.
---

# PRD Alchemist

Turn gathered product material into a structured, outcome-oriented Product
Requirements Document (PRD).

The PRD explains **what** is needed and **why** it matters. It may link to
high-level solution artifacts, but it does not replace downstream technical
specifications, acceptance criteria, QA checklists, or implementation plans.

## When to Use This Skill

Use this skill for the structured-writing phase, after or during product
discovery, when the user wants to:

- turn a rough collection of product material into a complete PRD;
- rewrite an existing PRD using the canonical hierarchy;
- fill gaps in a product document through a guided interview;
- prepare a PRD that can later be published to Confluence.

The preferred input is the output of a gathering phase plus any strategic
documents, notes, links, or decisions available. If the user starts with less,
ask for the missing information rather than inventing it.

## Output Contract

Produce one PRD using [`templates/prd.md`](./templates/prd.md). Write it to the
path requested by the user, or to `prd.md` in the current working directory when
no path is given. Never overwrite the bundled template.

- Write the machine-first document in **English**.
- Set `metadata.status` to `draft`.
- Preserve every stable ID exactly as written. IDs are always English and are
  never translated, including in a translated Confluence page.
- Include every template section and fixed artifact category. Use an explicit
  `Not applicable` with a reason when the user confirms a field does not apply;
  never silently remove it.
- Keep concrete facts traceable to source inputs.
- Do not advance the status, submit the PRD for evaluation, or create backlog
  items.

## Workflow

1. **Collect the writing inputs.** Read the gathered material, strategic input,
   existing product documents, linked artifacts, and confirmed decisions. Ask
   for referenced material that has not been provided.
2. **Map evidence to the template.** Organize the input under source inputs,
   metadata, related artifacts, Why, What, How, and Project management &
   monitoring. Distinguish confirmed facts from proposals and unresolved
   questions.
3. **Run the clarification gate.** Check every required field and section.
   Missing information, contradictions, vague goals, placeholder metrics, and
   unresolved scope choices are blockers unless the user explicitly confirms
   they are non-blocking or not applicable. Ask a few targeted questions at a
   time, starting with the gaps that most affect the document. **Do not write
   the PRD while blocking items remain open.**
4. **Write the PRD.** Rewrite the confirmed material into clear product
   language using the template. Measurement must contain concrete objectives
   and measurable key results or product KPIs, not generic placeholders. Keep
   technical content at the level of constraints, dependencies, and links to
   downstream artifacts.
5. **Validate and clean up.** Confirm that every stable ID remains present, all
   mandatory fields contain a value or an approved `Not applicable`, fixed
   artifact rows remain intact, no blocking decision is open, and no authoring
   guidance or placeholders remain.
6. **Offer Confluence publication.** Only after the PRD file is complete, ask:
   **"Do you want me to create a Confluence page for this PRD?"** Do not publish
   without an affirmative answer.
7. **Ask the publication language.** If the user says yes, ask which language
   the Confluence page should use. Then follow
   [`references/confluence-publication.md`](./references/confluence-publication.md).

## Clarification Rules

- **Ask, never infer.** Do not turn a suggestion into a decision, create
  metrics, choose scope, assign ownership, or resolve contradictions yourself.
- **Block when required.** A required field without a confirmed value or
  approved `Not applicable` prevents writing. Show the blocking questions
  clearly and resume after the user answers.
- **Separate non-blockers.** Record confirmed non-blocking research or decisions
  in `project.decisions-research`; do not hide them in prose.
- **Preserve competing positions.** When sources disagree, state the
  contradiction in the clarification question and ask the decision owner to
  resolve it.

## Stable IDs and Human Readability

The document is prose-first for people and structurally reliable for agents:

- HTML comments before headings are stable section IDs.
- The `ID` column in tables contains stable field or row IDs.
- IDs never change between revisions, even if visible headings are translated
  or reworded.
- Do not replace the document with JSON or YAML.

Treat IDs as a contract. Add a new ID only for a genuinely new field; never
reuse an existing ID for a different meaning.

## Boundaries

- Do not perform gathering-only aggregation when blocking writing inputs are
  missing; ask for them.
- Do not perform completeness review for committee submission as a separate
  approval gate.
- Do not publish or change lifecycle state without explicit user confirmation.
- Do not duplicate detailed SRS, RFC, design review, QA, rollout, or backlog
  content inside the PRD; link those artifacts instead.
