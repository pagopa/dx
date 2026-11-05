---
id: UC-05
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-05`: Start a reproducible development environment

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer.

**Secondary actors**: Team maintaining the workspace.

**Source artifact**: [Development environment guidance](../../apps/website/docs/dev-containers/index.md) and [workspace setup](../../apps/cli/README.md).

**Service Blueprint step**: [SB-03 Prepare workspace and environment](../service-blueprint.md#sb-03-prepare-workspace-and-environment).

**Domain entities**: Team, Workspace, Knowledge artifact.

**Trigger**: A developer starts work on a workspace using its shared development setup.

**Preconditions**:

- The workspace provides the relevant environment configuration.
- The developer has access to a compatible execution environment and the required prerequisites.

**Main flow**:

1. The developer obtains the workspace and its development environment configuration.
2. The developer starts the configured environment through a supported entry point.
3. The setup prepares the declared tools, initialization commands and workspace customizations.
4. The developer starts working in the prepared environment.

**Alternate flows**:

- `A1`: A team reuses the same configuration on different developer machines or in an automation context where supported.

**Exception flows / edge cases**:

- `E1`: A required prerequisite or initialization action fails -> Error: `DEVELOPMENT_ENVIRONMENT_UNAVAILABLE`; report the failed step, known or uncertain effects and a `partial` or `failed` outcome.

**Postconditions**:

- The developer has an environment prepared from the shared configuration, or setup has not been reported as successful.
- The guidance does not establish bit-for-bit reproducibility or identity with production.
- A failed setup does not report the environment as ready. Retry and rollback follow the agreed safety policies; implementation coverage remains unverified.

**Errors**:

- `DEVELOPMENT_ENVIRONMENT_UNAVAILABLE`: The environment cannot be prepared -> report the failed step, known or uncertain effects and `partial` or `failed`; do not report readiness. Retry and rollback follow the agreed safety policies.

**Acceptance checks**:

- `AC-01`: Given a valid shared configuration and prerequisites, the developer can start an environment that applies the declared setup and customizations. Evidence: [development environment guidance](../../apps/website/docs/dev-containers/index.md).
- `AC-02`: If a required initialization step fails, the operation reports `DEVELOPMENT_ENVIRONMENT_UNAVAILABLE` instead of reporting readiness. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-007`.
- `AC-03`: If some required setup steps succeeded and another fails, the result is `partial` and identifies the failed step and known or uncertain effects. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-007`.

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Developer
      participant Workspace
      participant Environment as Development environment
      Developer->>Workspace: Obtain shared configuration
      Developer->>Environment: Start configured setup
      Environment->>Environment: Prepare tools and customizations
      Environment-->>Developer: Prepared environment or failure
  ```

- Service Blueprint: [SB-03 Prepare workspace and environment](../service-blueprint.md#sb-03-prepare-workspace-and-environment).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-001`, `solution.components.item-003`.
- Interface / data contract: `contracts.item-003`.
- Validation evidence: [development environment guidance](../../apps/website/docs/dev-containers/index.md); executable parity evidence not supplied.

## Open questions and propagation

| ID           | Type     | Item                                                                                                                                                                                         | Impact / blocker                                                  | Owner            | Resolution / link                                                           |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `uc-open-01` | Decision | A failed setup reports the failed step, known or uncertain effects and `partial` or `failed`, without declaring the environment ready; retry and rollback follow the agreed safety policies. | The agreed behavior and its implementation remain to be verified. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; parent `open.item-007`. |
