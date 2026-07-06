---
name: write-prd
description: Draft a product requirements document (PRD) from goals, repository context, and stakeholder constraints. Use when asked to write a PRD, feature brief, scope, goals, non-goals, success metrics, rollout plan, or open questions for a product initiative.
---

# Write a PRD

Use this skill to produce a clear PRD that product, design, and engineering can review together.

## When to Use This Skill

- Writing the first PRD for a new feature or initiative.
- Turning rough notes, Jira issues, or repository context into a structured proposal.
- Refining scope before design review or implementation planning.

## Workflow

1. Inspect the repository, issue tracker context, and any notes the user already provided.
2. Reuse the user's language and domain terms; if the user mixes languages, default to the language used in the request.
3. Infer obvious constraints from the codebase before asking questions.
4. Ask only for missing decisions that materially affect scope or success criteria.
5. Produce a PRD with these sections:
   - Context
   - Problem statement
   - Goals
   - Non-goals
   - Target users or actors
   - Functional requirements
   - Constraints and assumptions
   - Success metrics
   - Rollout or validation plan
   - Open questions

## Output Rules

- Keep requirements observable and testable.
- Separate requirements from implementation details unless the user explicitly asks for a solution design.
- Call out dependencies, risks, and unresolved choices explicitly.
- Do not invent metrics, constraints, or stakeholder expectations that are not grounded in the prompt or repository context.
