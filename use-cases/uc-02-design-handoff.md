---
title: "Generate and refine a design handoff from the structured requirement"
id: UC-02
status: candidate
---

# `UC-02` - Generate and refine a design handoff from the structured requirement

## Traceability

| Field | Value |
| --- | --- |
| `uc.id` | `UC-02` |
| `uc.title` | Generate and refine a design handoff from the structured requirement |
| `uc.status` | candidate |
| `uc.priority` | Must |
| `uc.linked-jtbd` | `objectives.jtbd.item-002` |
| `uc.parent-dr` | [Local Design Review](../design-review.md); [Confluence Design Review](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206840661) |
| `uc.source-artifact` | [PRD](../prd.md); [Confluence PRD](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206414774) |
| `uc.service-blueprint-step` | N/A - no Service Blueprint was supplied; the pilot workflow discovery is still open |

## Actors

| Role | Actor name from PRD | Responsibility |
| --- | --- | --- |
| Primary actor | Designer | Use the structured requirement and Design System to create and refine the user flow and related design outputs. |
| Secondary actor | Product Manager | Resolve requirement ambiguity and approve whether the design remains aligned with the intended outcome. |

## Behavior contract

**Trigger**: A structured product requirement is validated and available for Design.

**Preconditions**:

- A current structured requirement version is available and its unresolved gaps are visible.
- The PagoPA Design System and relevant Web Framework references are accessible to the Designer or the generation capability.
- The Figma flow, design-token contract, and integration mechanism are not yet supplied.

**Main flow**:

1. Designer opens the validated structured requirement and confirms the intended outcome, actors, guardrails, and constraints.
2. The design-generation capability consumes the approved requirement and available Design System references to produce a first user-flow proposal. This capability is proposed and its boundary is TBD.
3. Designer reviews and refines the proposed flow, interaction model, design tokens, and copy in Figma or the approved design tool.
4. Designer records design decisions and unresolved questions against the requirement version.
5. Product Manager reviews the refined design for alignment with the product outcome and resolves or escalates open product questions.
6. The design handoff is marked available for Engineering together with its source requirement and review state.

**Alternate flows**:

- `A1`: If no design-generation capability is available, Designer creates the first flow manually using the structured requirement and Design System.
- `A2`: If the Design System does not contain a required pattern or token, Designer records the gap and proposes a system-level addition instead of silently introducing an inconsistent pattern.
- `A3`: If Product Manager identifies a mismatch with the intended outcome, the design returns to refinement and the affected requirement or decision is linked.

**Exception flows / edge cases**:

- `E1`: If the requirement is incomplete or contradictory, Designer stops the affected handoff and records the dependency rather than resolving product intent alone.
- `E2`: If the design tool or integration is unavailable, the design remains in a non-ready state until the artifact and traceability can be restored.
- `E3`: If an accessibility or usability issue is identified, the design cannot be marked ready until the issue is resolved or an explicit approved exception exists.

**Postconditions**:

- A reviewed design artifact and its relevant decisions are traceable to a structured requirement version, or the handoff is visibly blocked with a reason.
- Engineering can identify the design artifact, its review state, applicable Design System references, and unresolved questions.

## Acceptance checks

Each check must be binary, independently verifiable, and stable across
updates. Link it to evidence or a test when available.

- `AC-UC-02-01`: Engineering handoff is not marked ready when the source structured requirement is unresolved or unavailable. - Evidence: TBD
- `AC-UC-02-02`: The design handoff links to the exact structured requirement version used as its source. - Evidence: TBD
- `AC-UC-02-03`: The design artifact identifies applicable Design System references and records any missing pattern or token. - Evidence: Design review TBD
- `AC-UC-02-04`: A detected accessibility or usability issue is visible in the handoff state and prevents readiness until resolved or explicitly excepted. - Evidence: Accessibility review TBD
- `AC-UC-02-05`: Product Manager review outcome and unresolved product questions are recorded before the design is exposed to Engineering. - Evidence: TBD

## Tracking events

| Event ID / name | Trigger or flow step | Channel / source | Purpose | Status |
| --- | --- | --- | --- | --- |
| `design_handoff_started` | Main flow step 1 | Figma / toolchain | Measure time from validated requirement to design work. | Proposed |
| `design_flow_generated` | Main flow step 2 | System / agent audit | Measure generated-flow usage and AI-credit consumption. | Proposed |
| `design_handoff_refined` | Main flow step 3 | Figma / toolchain | Measure refinement completion and handoff effort. | Proposed |
| `design_handoff_reviewed` | Main flow step 5 | Toolchain | Measure Product review and clarification rounds. | Proposed |
| `design_handoff_ready` | Main flow step 6 | System / toolchain | Measure readiness for Engineering. | Proposed |

## Relevant links

- Sequence diagram: TBD
- Figma / design flow: TBD - no Figma artifact was supplied
- Endpoint / OpenAPI / AsyncAPI / Data Contract: TBD - design handoff contract is not defined
- Validation evidence: TBD

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Question | What design contract must be produced for Engineering, including tokens, logical flows, copy, and accessibility evidence? | Blocks handoff validation and downstream implementation. | TBD | PRD `open-questions.item-006` |
| `uc-open-02` | Question | Which Figma workspace, Design System version, and integration path are authoritative for the pilot? | Blocks traceability and tool integration. | TBD | PRD `open-questions.item-010` |
| `uc-open-03` | Question | Who approves exceptions when the Design System lacks a required pattern or token? | Affects governance and consistency. | TBD | TBD |
| `uc-open-04` | Assumption | Designer refinement and Product Manager review remain mandatory even when a first flow is generated by an agent. | Defines human accountability and acceptance boundaries. | TBD | PRD `objectives.jtbd.item-002` |
