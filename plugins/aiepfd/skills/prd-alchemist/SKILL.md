---
name: prd-alchemist
description: Turn product input into a first Product Requirements Document (PRD). Use when a product manager provides raw, scattered, or heterogeneous material (chat logs, meeting notes, documents, quick ideas) OR simply says they want to write a PRD, product spec, or requirements document and wants help building one. The skill works two ways: it analyzes and synthesizes material the user already has, and it interviews the user with targeted questions when material is thin or missing. It gives the input meaning, groups related information, asks clarifying questions whenever anything is unclear (never inventing), flags what stays open, and sets the metadata status to "draft" so a later stage can advance it. It does not publish, review, or advance the document beyond this initial gathering stage.
---

# PRD Alchemist

Transform a pile of unstructured product input into a coherent first PRD.

The user provides raw, scattered material about a product initiative. This skill
reads all of it, makes sense of it, and writes a PRD that captures what
has been understood so far — including what is still unclear. The finished PRD
carries a metadata status of `draft` so a later stage can advance it.

## About PRDs

A Product Requirements Document (PRD) is a shared artifact that aligns the people
working on a product initiative — typically **product managers, engineers, and
designers** — on what is being built and why, _before development begins_. It is
a communication and decision tool, not just a spec: it frames the problem, the
intended users, the goals, and the boundaries of the work so the team shares one
understanding. Keep this audience and purpose in mind when writing the PRD, so the
output reads as a coherent shared reference rather than a raw dump of notes.

## When to Use This Skill

This skill supports two entry points; both lead to the same PRD.

- **Material-first.** The user pastes or points to **unstructured material** (chat
  logs, meeting notes, documents, bullet points, half-formed ideas) about a
  product need and wants it **analyzed and synthesized** into a first PRD, or to
  "make sense of" scattered product notes.
- **Interview-first.** The user has little or no written material and simply says
  something like **"I want to write a PRD"**. Here the skill leads with targeted
  questions to build the PRD collaboratively.

In both cases, whenever something is unclear, missing, or contradictory, the
skill **asks the user** rather than guessing.

## What This Skill Produces

A single **PRD** that:

- captures everything meaningful found in the input, organized into coherent
  sections;
- gives scattered notes a shared meaning instead of copying them verbatim;
- explicitly lists gaps, ambiguities, and open questions found along the way;
- records the available metadata and any linked artifacts;
- carries stable, machine-readable identifiers on every field and section (see
  [Metadata and stable IDs](#metadata-and-stable-ids)), with `status: draft`.

The skill stops once the PRD is written. It does not publish, validate, review, or move the
document to any later stage.

## Workflow

1. **Gather all input.** Start from whatever the user brings.
   - _Material-first:_ collect every piece of material provided, and ask for
     anything they mention but have not shared yet. Do not discard input as
     "irrelevant" at this stage — completeness matters more than polish.
   - _Interview-first:_ if there is little or no material, don't wait for it. Open
     the conversation by asking what the product idea is, then move into the
     clarifying loop below to build the picture from the user's answers.
2. **Clarify — ask, never invent.** Before writing, identify the pieces the PRD
   genuinely needs (at minimum: the problem/need, the primary audience, and the
   key objective) and, whenever any of them is missing, unclear, or contradictory,
   **you MUST ask the user targeted questions** instead of guessing. Ask a few at
   a time, keep them concrete, and prioritise the gaps that would most change the
   PRD. Continue until you have a workable baseline, or the user explicitly says
   they want a PRD from what is available. This loop is what distinguishes the
   two entry modes only by how much asking is needed — the rule "never fabricate,
   always ask" is the same for both.
3. **Analyze.** Read across all the material and answers and identify the recurring
   themes: the underlying need or problem, the intended outcomes, who it is for,
   any scope signals, and any constraints. Note contradictions between sources.
4. **Synthesize the PRD.** Using
   [`templates/prd.md`](./templates/prd.md), write a coherent PRD
   that expresses the understanding, grouping related information under the right
   sections. Rewrite rough notes into clear prose rather than pasting them. Fill
   the metadata frontmatter and the "Linked artifacts" table with whatever the
   input and answers reveal; leave a field blank when its value is still unknown.
5. **Record what was resolved and what stays open.** Under "Open questions & gaps",
   keep two lists: what the clarifying loop **resolved during the session** (so the
   reader sees what was confirmed and by whom) and what is **still open** and needs
   a decision. A blank metadata field that you could not resolve belongs in "still
   open". Never fabricate a fact or decision to empty either list.
6. **Clean up the document.** The template contains authoring guidance — an HTML
   comment block and _italic_ placeholders — that helps you write but is not part
   of the document. Remove the guidance comment block and replace every
   placeholder with real content (or an explicit gap). **Keep** the YAML
   frontmatter keys and every `<!-- id: ... -->` anchor exactly as written — those
   are the stable identifiers, not guidance. The finished PRD should read as a
   clean artifact, not a filled-in form.
7. **Set status and stop.** Set the metadata field **status: draft** so a later
   stage can advance it. Do not go further.

## Guardrails

- **Ask, don't invent.** If something is missing, unclear, or contradictory, ask
  the user a targeted question. Only when they decline to answer or say to proceed
  do you record it as an open question — never fill the hole with a guess.
- **Preserve traceability.** Reference the source material the PRD was built
  from, so the reader can check the origin of each part.
- **Stay in the gathering stage.** Publishing, reviewing, and advancing the document are out of
  scope for this skill.

## Metadata and stable IDs

The PRD is **machine-first but human-readable**: automated agents should be
able to read and update specific fields without heuristically parsing free text.
Two mechanisms make that possible, and both must be preserved across every
revision:

- **Metadata frontmatter.** The YAML block at the top of the template carries the
  document metadata. Each key (`id`, `title`, `status`, `owner`, `contributors`,
  `stakeholders`, `created`, `last_updated`, `revision`, `target_release`,
  `tags`) is a **stable field ID**. Fill in every value the input reveals; leave a
  key blank when unknown rather than deleting it. Never rename a key.
- **Section anchors.** Every section is preceded by a `<!-- id: ... -->` anchor
  (for example `<!-- id: summary -->`, `<!-- id: scope.in -->`). The anchor is the
  section's **stable ID** and does not change even if the visible heading text is
  reworded. Never rename or remove an anchor; add new ones with fresh IDs if you
  introduce new sections.

Keeping IDs stable is the minimum requirement for extraction agents to locate a
field reliably across revisions. Treat the frontmatter keys and the anchors as a
contract, not decoration.

## Template

Use [`templates/prd.md`](./templates/prd.md) as the starting scaffold
for the PRD. Replace the italic placeholders with real content and delete the
authoring guidance comment; keep the frontmatter keys, the `<!-- id: ... -->`
section anchors, and the `status: draft` metadata.
