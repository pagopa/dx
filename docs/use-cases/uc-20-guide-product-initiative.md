---
id: UC-20
status: draft
priority: Should
parent_dr: ../design-review.md
---

# `UC-20`: Guide a product initiative with agentic workflows

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Product or delivery stakeholder using a coding agent.

**Secondary actors**: Product, engineering and design reviewers; work-item owners.

**Source artifact**: [Agentic delivery overview](../../plugins/padef/README.md), [design workflow](../../plugins/padef/skills/dr-blacksmith/SKILL.md), [Use Case workflow](../../plugins/padef/skills/uc-engraver/SKILL.md) and [backlog workflow](../../plugins/padef/skills/jira-magister/SKILL.md).

**Service Blueprint step**: [SB-02 Shape product work](../service-blueprint.md#sb-02-shape-product-work).

**Domain entities**: Team, Coding agent, Agent capability, Knowledge artifact, Product artifact and Use Case.

**Trigger**: A stakeholder needs to turn product evidence into linked, reviewable delivery artifacts.

**Preconditions**:

- The actor has the relevant source material and access to the applicable agent capabilities.
- The actor has the authority needed for any external work-management change.

**Main flow**:

1. The stakeholder provides source evidence and the desired artifact outcome.
2. The agent uses the appropriate workflow to create or update the relevant product or design artifact.
3. Detailed Use Cases are maintained as linked child artifacts with stable identifiers and explicit gaps.
4. Human reviewers decide lifecycle promotions and resolve material open decisions.
5. A backlog projection uses eligible ready Use Cases and preserves their traceability; external changes require the workflow's explicit confirmation.

**Alternate flows**:

- `A1`: A direct task intake starts with a design review when no PRD is supplied.
- `A2`: A single Use Case can be prepared independently of the readiness of the whole design document.

**Exception flows / edge cases**:

- `E1`: A required parent artifact cannot be found -> Error: `PARENT_ARTIFACT_MISSING`.
- `E2`: A required readiness decision or external mutation confirmation is absent -> Error: `APPROVAL_REQUIRED`.

**Postconditions**:

- Produced artifacts remain linked and distinguish confirmed information from gaps.
- A draft Use Case is not represented as ready, and proposing work does not itself mutate an external work system.

**Errors**:

- `PARENT_ARTIFACT_MISSING`: A child workflow cannot locate its required parent -> it asks for the parent and stops child creation.
- `APPROVAL_REQUIRED`: A required lifecycle or external-mutation confirmation is missing -> the promotion or mutation is not performed.

**Acceptance checks**:

- `AC-01`: A Use Case is a separate child artifact linked from its parent, with its stable identifier preserved. Evidence: [Use Case workflow](../../plugins/padef/skills/uc-engraver/SKILL.md).
- `AC-02`: A backlog projection consumes ready child Use Cases and does not treat draft children as ready. Evidence: [backlog workflow](../../plugins/padef/skills/jira-magister/SKILL.md).
- `AC-03`: An external work-system mutation is not performed before the required confirmation; the pending operation is `APPROVAL_REQUIRED`. Evidence: [backlog workflow](../../plugins/padef/skills/jira-magister/SKILL.md).
- `AC-04`: Without a supplied PRD, a direct intake can still create a design review that states outcome and scope. Evidence: [design workflow](../../plugins/padef/skills/dr-blacksmith/SKILL.md).

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Stakeholder
      participant Agent as Agentic workflow
      participant Artifacts as Linked product artifacts
      actor Reviewer
      participant Work as Work management
      Stakeholder->>Agent: Supply evidence and request
      Agent->>Artifacts: Create linked draft artifacts
      Reviewer->>Artifacts: Confirm applicable readiness
      Agent-->>Stakeholder: Propose eligible work
      Stakeholder->>Agent: Confirm external mutation
      Agent->>Work: Apply confirmed change
  ```

- Service Blueprint: [SB-02 Shape product work](../service-blueprint.md#sb-02-shape-product-work).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-001`, `solution.components.item-009`.
- Interface / data contract: `contracts.item-010`.
- Validation evidence: [design workflow](../../plugins/padef/skills/dr-blacksmith/SKILL.md), [backlog workflow](../../plugins/padef/skills/jira-magister/SKILL.md).

## Open questions and propagation

Cross-workflow authority and external mutation guardrails are tracked in parent
`open.item-002`. No additional behavior-local question has been identified.
