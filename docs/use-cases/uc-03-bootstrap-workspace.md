---
id: UC-03
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-03`: Bootstrap a development workspace

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer or coding agent.

**Secondary actors**: Repository owner and code collaboration service.

**Source artifact**: [CLI overview](../../apps/cli/README.md), [initialization flow](../../apps/cli/src/adapters/commander/commands/init.ts) and [published usage guide](../../apps/website/docs/dx-cli/usage.md).

**Service Blueprint step**: [SB-03 Prepare workspace and environment](../service-blueprint.md#sb-03-prepare-workspace-and-environment).

**Domain entities**: Team, Coding agent, Workspace, Knowledge artifact.

**Trigger**: A team starts a new development workspace using DX conventions.

**Preconditions**:

- The actor has a workspace name, ownership context and the prerequisites required by the selected setup.
- The actor has the necessary authority if remote publication is requested.
- Some prerequisite checks can require access to external services even when publication is declined.

**Main flow**:

1. The actor provides workspace details, interactively or through supported inputs.
2. The setup checks the relevant prerequisites and generates the local workspace.
3. The setup initializes the generated configuration needed by its validation flow.
4. The actor chooses whether to publish the workspace to the code collaboration service.
5. If publication is selected, the setup creates the remote repository, publishes the initial workspace and attempts to open a review request; otherwise it reports how to complete publication later.

**Alternate flows**:

- `A1`: A supplied publication preference avoids the publication prompt.
- `A2`: Publication is declined; the generated local workspace remains available.

**Exception flows / edge cases**:

- `E1`: A target repository already exists -> Error: `WORKSPACE_ALREADY_EXISTS`.
- `E2`: A prerequisite or setup action fails -> Error: `WORKSPACE_SETUP_FAILED`.

**Postconditions**:

- A successful local setup produces a workspace; remote publication occurs only in the selected publication path.
- Remote publication does not by itself guarantee that the review request was created.
- Failure does not imply automatic cleanup of previously completed actions; see parent `open.item-007`.

**Errors**:

- `WORKSPACE_ALREADY_EXISTS`: The target repository conflicts with an existing repository -> setup reports the conflict instead of overwriting it.
- `WORKSPACE_SETUP_FAILED`: A prerequisite, generation, initialization or publication step fails -> the actor receives a failure; completed earlier steps may remain.

**Acceptance checks**:

- `AC-01`: Given valid inputs and prerequisites, setup creates a local workspace with the documented standard structure. Evidence: [CLI overview](../../apps/cli/README.md).
- `AC-02`: Given a decision not to publish, setup retains the local workspace and does not create the remote repository. Evidence: [initialization flow](../../apps/cli/src/adapters/commander/commands/init.ts).
- `AC-03`: Given an existing target repository, setup reports `WORKSPACE_ALREADY_EXISTS` rather than overwriting it. Evidence: [repository existence check](../../apps/cli/src/adapters/plop/index.ts).

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Consumer as Developer or agent
      participant Setup as Workspace setup
      participant Repo as Code collaboration
      Consumer->>Setup: Provide workspace details
      Setup->>Setup: Generate and initialize workspace
      Setup-->>Consumer: Request or use publication choice
      opt Publication selected
          Setup->>Repo: Create and publish repository
      end
      Setup-->>Consumer: Workspace and publication outcome
  ```

- Service Blueprint: [SB-03 Prepare workspace and environment](../service-blueprint.md#sb-03-prepare-workspace-and-environment).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-002`, `solution.components.item-003`, `solution.components.item-004`.
- Interface / data contract: `contracts.item-001`, `contracts.item-003`.
- Validation evidence: [initialization tests](../../apps/cli/src/adapters/commander/commands/__tests__/init.test.ts).

## Open questions and propagation

| ID           | Type     | Item                                                                                                                                                        | Impact / blocker                                                                                                                            | Owner            | Resolution / link                                                                                                                                                                     |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uc-open-01` | Decision | Remote publication is optional; the local workspace remains available when publication is declined, without assuming that external prerequisites disappear. | The published usage guide now reflects the agreed contract and distinguishes a publication attempt from guaranteed review-request creation. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; [usage guide](../../apps/website/docs/dx-cli/usage.md), [implementation](../../apps/cli/src/adapters/commander/commands/init.ts). |
