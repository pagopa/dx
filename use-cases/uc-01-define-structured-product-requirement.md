---
title: "Define and validate a structured product requirement"
id: UC-01
status: candidate
---

# `UC-01` - Define and validate a structured product requirement

## Traceability

| Field | Value |
| --- | --- |
| `uc.id` | `UC-01` |
| `uc.title` | Define and validate a structured product requirement |
| `uc.status` | candidate |
| `uc.priority` | Must |
| `uc.linked-jtbd` | `objectives.jtbd.item-001` |
| `uc.parent-dr` | [Local Design Review](../design-review.md); [Confluence Design Review](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206840661) |
| `uc.source-artifact` | [PRD](../prd.md); [Confluence PRD](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206414774) |
| `uc.service-blueprint-step` | N/A - no Service Blueprint was supplied; the pilot workflow discovery is still open |

## Actors

| Role | Actor name from PRD | Responsibility |
| --- | --- | --- |
| Primary actor | Product Manager | Define the product need, requirements, edge cases, success metrics, and applicable constraints. |
| Secondary actor | AI agent | Review the structured input for potential omissions or inconsistencies within approved boundaries. |

## Behavior contract

**Trigger**: Product Manager starts a product change that requires a handoff to Design, Engineering, QA, or Operations.

**Preconditions**:

- The Product Manager has access to the approved structured-requirement template, but the canonical template and schema are not yet supplied.
- The source context, intended outcome, actors, JTBD, constraints, and success measures are available or explicitly marked as unresolved.
- The AI agent execution boundary, data permissions, and validation rules are not yet confirmed.

**Main flow**:

1. Product Manager records the product context, problem, actors, JTBD, expected outcome, success metric, quality guardrails, constraints, and known edge cases in a structured requirement.
2. The validation capability checks the required content and traceability fields. This validation capability is proposed and its exact rules are TBD.
3. AI agent reviews the structured requirement within the approved data boundary and returns potential omissions, ambiguities, or risks.
4. Product Manager accepts, rejects, or resolves each returned item and updates the structured requirement.
5. The validation capability records a versioned requirement and exposes its readiness state to downstream contributors.

**Alternate flows**:

- `A1`: If a required field is unavailable, Product Manager records the gap explicitly; the requirement remains incomplete and cannot be represented as ready until the gap is resolved or an approved exception exists.
- `A2`: If a stakeholder changes the product intent after validation, Product Manager creates a new version and re-runs validation.
- `A3`: If AI review is unavailable, Product Manager continues with the approved non-agent validation path if one is defined; the fallback mechanism is TBD.

**Exception flows / edge cases**:

- `E1`: If the input contains data that the approved AI boundary does not allow, the AI review is not executed and the requirement is routed for a human or Privacy decision.
- `E2`: If validation detects contradictory objectives, metrics, or constraints, the requirement is marked unresolved rather than published as ready.
- `E3`: If contract persistence or versioning fails, no ready state is exposed; the recovery and retry behavior are TBD.

**Postconditions**:

- A versioned structured requirement exists with its validation state and unresolved gaps visible, or the attempt is explicitly blocked with a reason.
- Downstream contributors can identify the current requirement version and its source evidence if the contract is marked ready.

## Acceptance checks

Each check must be binary, independently verifiable, and stable across
updates. Link it to evidence or a test when available.

- `AC-UC-01-01`: A structured requirement cannot be marked ready when a mandatory field or unresolved contradiction is present. - Evidence: TBD
- `AC-UC-01-02`: The structured requirement contains a traceable JTBD, expected outcome, success metric, quality guardrail, and applicable constraints before it is exposed to downstream phases. - Evidence: TBD
- `AC-UC-01-03`: Every AI-generated omission or risk returned during validation has a visible Product Manager disposition. - Evidence: TBD
- `AC-UC-01-04`: A changed product intent creates a distinguishable requirement version rather than silently overwriting the previously validated version. - Evidence: TBD
- `AC-UC-01-05`: Inputs outside the approved AI data boundary are not sent to the AI agent. - Evidence: Security / Privacy review TBD

## Tracking events

| Event ID / name | Trigger or flow step | Channel / source | Purpose | Status |
| --- | --- | --- | --- | --- |
| `structured_requirement_created` | Main flow step 1 | System / toolchain | Measure adoption and requirement creation volume. | Proposed |
| `structured_requirement_validated` | Main flow step 2 | System / toolchain | Measure validation completion and validation failures. | Proposed |
| `structured_requirement_ai_reviewed` | Main flow step 3 | System / agent audit | Measure AI review usage and credit consumption. | Proposed |
| `structured_requirement_approved` | Main flow step 5 | System / toolchain | Measure ready handoffs and lead-time contribution. | Proposed |
| `structured_requirement_versioned` | Alternate flow A2 | System / toolchain | Preserve change traceability. | Proposed |

## Relevant links

- Sequence diagram: TBD
- Figma / design flow: N/A - no Figma artifact was supplied for this authoring workflow
- Endpoint / OpenAPI / AsyncAPI / Data Contract: TBD - the structured contract and integration interfaces are not defined
- Validation evidence: TBD

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Question | What is the canonical structured-requirement schema and which fields are mandatory? | Blocks validation, versioning, and downstream handoff. | TBD | PRD `open-questions.item-006` |
| `uc-open-02` | Question | Which AI data boundary, model, retention, and access controls apply to requirement review? | Blocks AI execution and Privacy approval. | TBD | PRD `open-questions.item-007` |
| `uc-open-03` | Question | What is the approved fallback when the AI review or contract persistence capability is unavailable? | Affects continuity and operational behavior. | TBD | TBD |
| `uc-open-04` | Assumption | Human Product Manager disposition is required for every AI suggestion before the requirement is ready. | Requires explicit role and audit controls. | TBD | DR `solution.decision.item-003` |
