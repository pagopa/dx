---
id: UC-06
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-06`: Assess workspace conformance

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer or coding agent.

**Secondary actors**: Team maintaining the workspace.

**Source artifact**: [Workspace assessment](../../apps/cli/src/domain/doctor.ts) and [assessment interface](../../apps/cli/src/adapters/commander/commands/doctor.ts).

**Service Blueprint step**: [SB-03 Prepare workspace and environment](../service-blueprint.md#sb-03-prepare-workspace-and-environment).

**Domain entities**: Team, Coding agent, Workspace, Change and validation result.

**Trigger**: The actor wants to check whether a workspace follows supported DX conventions.

**Preconditions**:

- The actor can access the workspace and the assessment capability.

**Main flow**:

1. The actor starts the workspace assessment.
2. The assessment locates the workspace and runs the supported configuration checks.
3. The assessment returns an individual result for each check and an overall status.
4. The actor uses failed checks to identify configuration that needs attention.

**Alternate flows**:

- `A1`: The actor requests a supported machine-readable result instead of a human-readable summary.

**Exception flows / edge cases**:

- `E1`: The workspace root cannot be located -> Error: `WORKSPACE_NOT_FOUND`.
- `E2`: A check fails or cannot be completed -> Error: `WORKSPACE_CHECK_FAILED`.

**Postconditions**:

- The assessment reports problems without changing the assessed workspace.
- A failed check is reflected in the overall failure status.

**Errors**:

- `WORKSPACE_NOT_FOUND`: The assessment cannot locate a repository root -> it returns a failed detection check.
- `WORKSPACE_CHECK_FAILED`: A check is invalid or cannot complete -> the result identifies a failure and the operation returns a failure status.

**Acceptance checks**:

- `AC-01`: Given an accessible workspace, the result contains named checks and identifies whether any check failed. Evidence: [assessment logic](../../apps/cli/src/domain/doctor.ts).
- `AC-02`: Given a missing workspace root, the result contains a failed detection check, classified as `WORKSPACE_NOT_FOUND`, and is unsuccessful. Evidence: [assessment logic](../../apps/cli/src/domain/doctor.ts).
- `AC-03`: Given at least one failed check, the command returns a failure exit status and reports `WORKSPACE_CHECK_FAILED`. Evidence: [assessment interface](../../apps/cli/src/adapters/commander/commands/doctor.ts).

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Consumer as Developer or agent
      participant Assessment as Workspace assessment
      participant Workspace
      Consumer->>Assessment: Request assessment
      Assessment->>Workspace: Read supported configuration
      Workspace-->>Assessment: Configuration
      Assessment-->>Consumer: Individual checks and overall status
  ```

- Service Blueprint: [SB-03 Prepare workspace and environment](../service-blueprint.md#sb-03-prepare-workspace-and-environment).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-002`, `solution.components.item-003`.
- Interface / data contract: `contracts.item-001`.
- Validation evidence: [assessment logic](../../apps/cli/src/domain/doctor.ts), [assessment interface](../../apps/cli/src/adapters/commander/commands/doctor.ts).

## Open questions and propagation

The supported check inventory and portable result contract are tracked in
parent `open.item-001` and `open.item-005`. No additional behavior-local
question has been identified.
