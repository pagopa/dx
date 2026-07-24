---
title: "Implement and review an AI-assisted engineering task"
id: UC-03
status: candidate
---

# `UC-03` - Implement and review an AI-assisted engineering task

## Traceability

| Field | Value |
| --- | --- |
| `uc.id` | `UC-03` |
| `uc.title` | Implement and review an AI-assisted engineering task |
| `uc.status` | candidate |
| `uc.priority` | Must |
| `uc.linked-jtbd` | `objectives.jtbd.item-003` |
| `uc.parent-dr` | [Local Design Review](../design-review.md); [Confluence Design Review](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206840661) |
| `uc.source-artifact` | [PRD](../prd.md); [Confluence PRD](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206414774) |
| `uc.service-blueprint-step` | N/A - no Service Blueprint was supplied; the pilot workflow discovery is still open |

## Actors

| Role | Actor name from PRD | Responsibility |
| --- | --- | --- |
| Primary actor | Engineer | Review the structured task, supervise AI-assisted implementation, refine the result, and approve the Pull Request. |
| Secondary actor | AI agent | Generate implementation changes and tests within approved repository, tool, and data boundaries. |

## Behavior contract

**Trigger**: A Jira task has a validated structured requirement and an available design handoff for implementation.

**Preconditions**:

- The Jira task links to the current structured requirement and design handoff versions.
- The target repository, engineering standards, Web Framework components, and test commands are available to the approved execution context.
- Remote Cloud-agent execution is available or an approved non-agent fallback exists; the exact platform and permissions are TBD.

**Main flow**:

1. Engineer confirms that the Jira task has the required source contracts, constraints, and review state.
2. Engineer assigns or activates the approved AI coding agent from the Jira task.
3. AI agent consumes the allowed task context and generates implementation changes and unit tests using the applicable engineering standards and Web Framework components.
4. AI agent records generated-output provenance and returns the changes for human review.
5. Engineer reviews the changes and tests, adds or requests refinements, and verifies alignment with the requirement and design contracts.
6. Engineer approves the Pull Request only when the applicable engineering checks and human review are complete.

**Alternate flows**:

- `A1`: If the task lacks a required contract or review state, Engineer returns it to the upstream phase instead of starting implementation.
- `A2`: If the generated output is incomplete, Engineer refines it manually or requests another bounded generation cycle.
- `A3`: If the AI agent is unavailable, Engineer follows the approved manual implementation path and records the absence of agent execution.

**Exception flows / edge cases**:

- `E1`: If the agent requests or receives data outside its approved repository or task boundary, execution is blocked and the event is recorded for Security or Privacy review.
- `E2`: If generated code fails engineering checks or tests, the Pull Request remains unapproved until the failure is resolved or an explicit exception is approved.
- `E3`: If the design or requirement changes during implementation, Engineer stops approval and links the Pull Request to the updated contract versions.
- `E4`: If agent execution exceeds its assigned credit budget, the execution is stopped or escalated according to a budget policy that is not yet defined.

**Postconditions**:

- A Pull Request exists with traceability to the source requirement and design versions, human review state, generated-output provenance, and test evidence.
- The change is either approved for the next phase or explicitly blocked with its reason.

## Acceptance checks

Each check must be binary, independently verifiable, and stable across
updates. Link it to evidence or a test when available.

- `AC-UC-03-01`: The AI coding agent cannot start when the Jira task does not link to the required structured requirement and design handoff versions. - Evidence: TBD
- `AC-UC-03-02`: Generated code and tests identify the source task and preserve output provenance for human review. - Evidence: Audit contract TBD
- `AC-UC-03-03`: A Pull Request cannot be approved without an Engineer review and the applicable engineering checks. - Evidence: Repository branch protection / CI TBD
- `AC-UC-03-04`: Agent execution cannot access repositories, data, or credentials outside its approved task boundary. - Evidence: Security architecture review TBD
- `AC-UC-03-05`: The task records whether implementation used the AI-agent path or the approved manual fallback. - Evidence: Tracking contract TBD

## Tracking events

| Event ID / name | Trigger or flow step | Channel / source | Purpose | Status |
| --- | --- | --- | --- | --- |
| `engineering_task_agent_started` | Main flow step 2 | Jira / agent audit | Measure agent adoption and execution volume. | Proposed |
| `engineering_output_generated` | Main flow step 4 | Agent audit / GitHub | Preserve provenance and measure generated output. | Proposed |
| `engineering_pull_request_reviewed` | Main flow step 5 | GitHub | Measure human review effort and outcomes. | Proposed |
| `engineering_pull_request_approved` | Main flow step 6 | GitHub | Measure readiness for QA and delivery. | Proposed |
| `engineering_agent_budget_exceeded` | Exception flow E4 | Agent audit / dashboard | Monitor credit-budget failures and escalation. | Proposed |

## Relevant links

- Sequence diagram: TBD
- Figma / design flow: TBD - source design handoff contract is not defined
- Endpoint / OpenAPI / AsyncAPI / Data Contract: TBD - Jira, repository, agent, and evidence interfaces are not defined
- Validation evidence: TBD

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Question | Which remote agent platform, model, repository permissions, network boundary, and secrets policy are approved? | Blocks implementation and Security review. | TBD | PRD `open-questions.item-008` |
| `uc-open-02` | Question | What exact contract versions are required before Jira can activate an engineering task? | Blocks readiness gating and traceability. | TBD | PRD `open-questions.item-006` |
| `uc-open-03` | Question | Which engineering checks are mandatory before human approval? | Blocks binary approval validation. | TBD | Engineering review required |
| `uc-open-04` | Question | What happens when an agent exceeds its task credit budget? | Blocks budget enforcement and recovery behavior. | TBD | PRD `open-questions.item-009` |
| `uc-open-05` | Assumption | Human Engineer approval remains mandatory for all AI-generated implementation changes. | Defines accountability and repository controls. | TBD | DR `solution.decision.item-003` |
