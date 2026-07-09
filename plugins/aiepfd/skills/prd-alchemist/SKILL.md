---
name: prd-alchemist
description: Turn unstructured product input into a first Product Requirements Document (PRD) draft. Use when a product manager provides raw, scattered, or heterogeneous material (chat logs, meeting notes, documents, quick ideas) and wants it analyzed and synthesized into a coherent draft PRD, product spec, or requirements document that captures what has been understood. The skill reads all the input, gives it meaning, groups related information, flags gaps and open questions, and produces a draft with status "draft". It does not publish, review, or advance the document beyond the draft stage.
---

# PRD Alchemist

Transform a pile of unstructured product input into a coherent first PRD draft.

The user provides raw, scattered material about a product initiative. This skill
reads all of it, makes sense of it, and writes a **draft** PRD that captures what
has been understood so far — including what is still unclear.

## About PRDs

A Product Requirements Document (PRD) is a shared artifact that aligns the people
working on a product initiative — typically **product managers, engineers, and
designers** — on what is being built and why, _before development begins_. It is
a communication and decision tool, not just a spec: it frames the problem, the
intended users, the goals, and the boundaries of the work so the team shares one
understanding. Keep this audience and purpose in mind when drafting, so the
output reads as a coherent shared reference rather than a raw dump of notes.

## When to Use This Skill

- The user pastes or points to **unstructured material** (chat logs, meeting
  notes, documents, bullet points, half-formed ideas) about a product need.
- The user wants that material **analyzed and synthesized** into a first draft.
- The user asks to **start a PRD** from raw input, or to "make sense of" scattered
  product notes.

## What This Skill Produces

A single **PRD draft** that:

- captures everything meaningful found in the input, organized into coherent
  sections;
- gives scattered notes a shared meaning instead of copying them verbatim;
- explicitly lists gaps, ambiguities, and open questions found along the way;
- carries the metadata field **Status: draft**.

The skill stops at the draft. It does not publish, validate, review, or move the
document to any later stage.

## Workflow

1. **Gather all input.** Collect every piece of material the user provides. Ask
   for anything they mention but have not shared yet. Do not discard input as
   "irrelevant" at this stage — completeness matters more than polish.
2. **Analyze.** Read across all the material and identify the recurring themes:
   the underlying need or problem, the intended outcomes, who it is for, any
   scope signals, and any constraints. Note contradictions between sources.
3. **Synthesize a draft.** Using
   [`templates/prd-draft.md`](./templates/prd-draft.md), write a coherent draft
   that expresses the understanding, grouping related information under the right
   sections. Rewrite rough notes into clear prose rather than pasting them.
4. **Surface gaps, don't invent.** Whenever the input is missing, unclear, or
   contradictory, record it under "Open questions & gaps". Never fabricate facts
   or decisions to fill a hole.
5. **Set status and stop.** Set the metadata field **Status: draft**. Do not go
   further.

## Guardrails

- **Do not fabricate.** If it is not in the input and cannot be reasonably
  inferred, mark it as an open question instead of making it up.
- **Preserve traceability.** Reference the source material the draft was built
  from, so the reader can check the origin of each part.
- **Stay at draft.** Publishing, reviewing, and advancing the document are out of
  scope for this skill.

## Template

Use [`templates/prd-draft.md`](./templates/prd-draft.md) as the starting scaffold
for the draft. Replace the italic guidance with real content; keep the section
structure and the `Status: draft` metadata.
