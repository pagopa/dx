---
id: UC-13
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-13`: Validate and integrate a change

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer or coding agent.

**Secondary actors**: Reviewers and delivery automation.

**Source artifact**: [Collaboration guidance](../../apps/website/docs/github/index.md), [delivery overview](../../apps/website/docs/pipelines/index.md) and [validation workflow](../../.github/workflows/validate-v2.yaml).

**Service Blueprint step**: [SB-05 Validate, release and publish](../service-blueprint.md#sb-05-validate-release-and-publish).

**Domain entities**: Team, Coding agent, Workspace, Change and validation result.

**Trigger**: The actor proposes a change for review or integration.

**Preconditions**:

- The workspace and change are available to the validation process.
- The configured checks and review policies are accessible.

**Main flow**:

1. The actor proposes a change and supplies the context needed for review.
2. Delivery automation identifies the relevant validation work and runs configured checks.
3. The system reports the check outcomes to the team.
4. Reviewers assess the change and any required approvals.
5. An authorized actor can integrate the change once its configured required checks and approvals are satisfied.

**Alternate flows**:

- `A1`: The selected checks differ according to the affected parts of the workspace.
- `A2`: Some guidance is advisory rather than an enforced gate; its status must not be represented as a required check.

**Exception flows / edge cases**:

- `E1`: A configured required check fails -> Error: `VALIDATION_FAILED`.
- `E2`: A required review or approval is absent -> Error: `APPROVAL_REQUIRED`.

**Postconditions**:

- The team can distinguish successful, failed and pending checks.
- A protected integration path does not treat an unmet required gate as satisfied.

**Errors**:

- `VALIDATION_FAILED`: A required validation check fails -> its failure is reported and the required gate is not satisfied.
- `APPROVAL_REQUIRED`: A configured approval has not been granted -> the protected change remains pending.

**Acceptance checks**:

- `AC-01`: The documented validation workflow runs relevant configured quality checks and reports their results for affected work. Evidence: [validation workflow](../../.github/workflows/validate-v2.yaml).
- `AC-02`: When a required check fails, the change does not satisfy that check and is classified as `VALIDATION_FAILED`. Evidence: [validation workflow](../../.github/workflows/validate-v2.yaml).
- `AC-03`: Where a review or approval gate is configured, an unapproved change remains pending as `APPROVAL_REQUIRED`. Evidence: [branch protection rules](../../infra/modules/github_environment_bootstrap/github_branch_rules.tf).

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Author as Developer or agent
      participant Change as Proposed change
      participant Checks as Validation automation
      actor Reviewer
      Author->>Change: Propose change
      Change->>Checks: Run relevant checks
      Checks-->>Change: Check outcomes
      Reviewer->>Change: Review and approve when required
      Change-->>Author: Integration or pending status
  ```

- Service Blueprint: [SB-05 Validate, release and publish](../service-blueprint.md#sb-05-validate-release-and-publish).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-005`, `solution.components.item-011`.
- Interface / data contract: `contracts.item-006`.
- Validation evidence: [validation workflow](../../.github/workflows/validate-v2.yaml).

## Open questions and propagation

Required versus advisory gates and applicable approval policies are tracked in
parent `open.item-001` and `open.item-002`. No additional behavior-local
question has been identified.
