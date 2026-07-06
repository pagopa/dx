---
name: write-use-cases
description: Produce structured use cases from a PRD, backlog item, or feature idea. Use when asked to write use cases, actor flows, main and alternate scenarios, preconditions, postconditions, acceptance criteria, or edge cases for a product feature.
---

# Write Use Cases

Use this skill to transform requirements into clear actor-driven scenarios that product and engineering can validate together.

## When to Use This Skill

- Breaking a PRD into concrete user and system interactions.
- Clarifying actor responsibilities, happy paths, alternate flows, and failures.
- Preparing material that will later be decomposed into Jira stories.

## Workflow

1. Identify the actors, their goals, and the trigger for each use case.
2. Group flows by user outcome instead of by UI screen or implementation component.
3. For each use case, include:
   - Title
   - Goal
   - Primary actor
   - Supporting actors or systems
   - Preconditions
   - Trigger
   - Main success scenario
   - Alternate flows
   - Error flows
   - Postconditions
   - Acceptance criteria
4. Call out ambiguous or conflicting requirements separately instead of forcing them into the scenario.

## Output Rules

- Keep one business outcome per use case.
- Make alternate and error flows observable and testable.
- Avoid implementation detail unless it changes the behavior seen by the actor.
- Preserve the user's terminology so the use cases stay aligned with the source material.
