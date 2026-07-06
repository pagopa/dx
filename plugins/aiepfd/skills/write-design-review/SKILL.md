---
name: write-design-review
description: Draft a technical design review for a feature using repository context, requirements, and constraints. Use when asked for a design review, architecture proposal, technical approach, alternatives analysis, migration plan, or implementation risks before coding.
---

# Write a Design Review

Use this skill to turn product intent into an engineering design that can be reviewed before implementation.

## When to Use This Skill

- Preparing a design review after a PRD or backlog item is ready.
- Comparing architecture options for a new feature or system change.
- Documenting migration steps, risks, and operational impact before implementation.

## Workflow

1. Read the relevant repository areas and summarize the current architecture that the change will touch.
2. Extract requirements, constraints, and open questions from the user request, PRD, or issue context.
3. Propose the simplest viable design that fits the existing architecture and conventions.
4. Compare alternatives only when they are realistic options for this repository.
5. Produce a design review with these sections:
   - Context
   - Goals and non-goals
   - Current state
   - Proposed design
   - Alternatives considered
   - Data flow or interaction flow
   - Risks and mitigations
   - Rollout and migration
   - Observability and operations
   - Open questions

## Output Rules

- Ground the proposal in actual repository structure and existing patterns.
- Highlight user-visible tradeoffs, operational costs, and migration risk.
- Avoid vague recommendations such as "use best practices" without naming the concrete choice.
- When important information is missing, state the assumption instead of silently filling the gap.
