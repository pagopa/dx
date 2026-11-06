---
id: UC-07
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-07`: Apply a supported migration

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer or coding agent.

**Secondary actors**: Team maintaining the workspace.

**Source artifact**: [CLI overview](../../apps/cli/README.md), [migration listing](../../apps/cli/src/use-cases/list-codemods.ts) and [migration execution](../../apps/cli/src/use-cases/apply-codemod.ts).

**Service Blueprint step**: [SB-07 Support and evolve](../service-blueprint.md#sb-07-support-and-evolve).

**Domain entities**: Workspace, Change and validation result, Knowledge artifact.

**Trigger**: A team needs to update workspace code or configuration using an available migration.

**Preconditions**:

- The actor can access the workspace and migration catalog.
- The actor can modify the intended workspace files.

**Main flow**:

1. The actor lists the available migrations and their descriptions.
2. The actor selects a migration by its stable identifier.
3. The migration capability reads the relevant workspace information.
4. The selected migration applies its supported transformation and reports its outcome.
5. The team reviews and validates the resulting change through its normal process.

**Alternate flows**:

- `A1`: The actor inspects the catalog without applying a migration; the workspace remains unchanged.
- `A2`: A documented migration path for an incompatible contract change may be manual when no automated migration is available.

**Exception flows / edge cases**:

- `E1`: The selected identifier is not in the catalog -> Error: `MIGRATION_NOT_FOUND`.
- `E2`: Workspace inspection or the migration fails -> Error: `MIGRATION_FAILED`.

**Postconditions**:

- A successful invocation reports the selected migration.
- A failed invocation is not evidence that all prior file changes were undone; see parent `open.item-007`.
- Automatic retries are bounded and allowed only for transient failures when repetition is safe; uncertain effects must be checked first. Current implementation coverage remains unverified in parent `open.item-007`.
- Automatic rollback is allowed only when authorized, safe and verified; otherwise report effects and reconciliation guidance. Current implementation coverage remains unverified.

**Errors**:

- `MIGRATION_NOT_FOUND`: No migration matches the identifier -> no migration is applied and the actor receives an error.
- `MIGRATION_FAILED`: Inspection or transformation fails -> the actor receives an error; partial changes may need review.

**Acceptance checks**:

- `AC-01`: Listing migrations returns their identifiers and descriptions without applying one. Evidence: [migration interface](../../apps/cli/src/adapters/commander/commands/codemod.ts).
- `AC-02`: Given a known migration and a suitable workspace, invocation runs the selected transformation and reports its identifier. Evidence: [migration execution](../../apps/cli/src/use-cases/apply-codemod.ts).
- `AC-03`: Given an unknown identifier, invocation reports `MIGRATION_NOT_FOUND` without applying a migration. Evidence: [migration execution](../../apps/cli/src/use-cases/apply-codemod.ts).

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Consumer as Developer or agent
      participant Catalog as Migration catalog
      participant Migration as Migration capability
      participant Workspace
      Consumer->>Catalog: List available migrations
      Catalog-->>Consumer: Identifiers and descriptions
      Consumer->>Migration: Select identifier
      Migration->>Workspace: Inspect and transform
      Migration-->>Consumer: Outcome
  ```

- Service Blueprint: [SB-07 Support and evolve](../service-blueprint.md#sb-07-support-and-evolve).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-002`, `solution.components.item-003`, `solution.components.item-011`.
- Interface / data contract: `contracts.item-001`, `contracts.item-003`.
- Validation evidence: [migration execution tests](../../apps/cli/src/use-cases/__tests__/apply-codemod.test.ts).

## Open questions and propagation

Recovery and partial-change semantics are tracked in parent `open.item-007`.
No additional behavior-local question has been identified.
