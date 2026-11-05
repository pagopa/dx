---
id: UC-15
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-15`: Release a service safely

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Service-owning team or its authorized automation.

**Secondary actors**: Approval authority and service consumers.

**Source artifact**: [Deployment behavior](../../actions/deploy/README.md), [delivery overview](../../apps/website/docs/pipelines/index.md) and [protected environments](../../infra/modules/github_environment_bootstrap/README.md).

**Service Blueprint step**: [SB-05 Validate, release and publish](../service-blueprint.md#sb-05-validate-release-and-publish).

**Domain entities**: Team, Environment, Service and release, Change and validation result.

**Trigger**: A team has a service version ready to deploy to an environment.

**Preconditions**:

- The target and required staging configuration exist.
- The version is available and the actor has deployment authority and any required approval.

**Main flow**:

1. The actor selects a service, environment and version.
2. The delivery capability stages the new version without changing production traffic.
3. Where configured, the delivery capability moves traffic incrementally and runs the supplied validation at each step.
4. After the configured checks succeed, the new version is promoted and the rollout is finalized.
5. The actor receives the deployment outcome.

**Alternate flows**:

- `A1`: Without an optional incremental validation script, the supported flow promotes the staged version directly.
- `A2`: In a documented target type, staging verifies the new revision's health before it can be rolled out; this is not a universal staging guarantee.

**Exception flows / edge cases**:

- `E1`: A configured incremental validation fails or returns invalid instructions -> Error: `ROLLOUT_VALIDATION_FAILED`.
- `E2`: Staging fails for a supported target -> Error: `STAGING_FAILED`.
- `E3`: A required deployment approval is absent -> Error: `APPROVAL_REQUIRED`.

**Postconditions**:

- A successful rollout serves the new version through the selected delivery path.
- On an incremental-validation failure, rollout stops. The previous traffic path is restored only when automatic restoration is authorized, safe and verified; otherwise report effects and reconciliation guidance.
- The current documented rollout restores the previous traffic path on validation failure, but evidence that it satisfies the agreed safety policy remains open in parent `open.item-007`.
- Each declared target identifies whether it supports staging health checks, incremental rollout and recovery; those capabilities are not universally required.

**Errors**:

- `ROLLOUT_VALIDATION_FAILED`: Configured validation fails or returns invalid instructions -> rollout stops; restore the previous traffic path only when authorized, safe and verified, otherwise report effects and reconciliation guidance.
- `STAGING_FAILED`: The selected staging operation fails -> the new version is not reported as successfully staged.
- `APPROVAL_REQUIRED`: A configured approval gate is unmet -> the protected deployment remains pending.

**Acceptance checks**:

- `AC-01`: Given a configured incremental rollout, the system moves traffic in steps and executes the supplied validation at each step. Evidence: [deployment behavior](../../actions/deploy/README.md).
- `AC-02`: If incremental validation fails or its instructions are invalid and rollback is authorized, safe and verified, the system reports `ROLLOUT_VALIDATION_FAILED`, stops and restores the previous traffic path. Evidence: [deployment behavior](../../actions/deploy/README.md), stakeholder decision in `uc-open-01`; safety verification remains open.
- `AC-03`: If no incremental validation script is configured, the documented rollout promotes the staged version directly rather than claiming that incremental checks ran. Evidence: [deployment behavior](../../actions/deploy/README.md).
- `AC-04`: In a protected environment, an unmet approval gate remains `APPROVAL_REQUIRED`. Evidence: [protected environments](../../infra/modules/github_environment_bootstrap/README.md).
- `AC-05`: If `ROLLOUT_VALIDATION_FAILED` and rollback is not authorized, safe and verified, the system stops without automatic restoration and reports known or uncertain effects and reconciliation guidance. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-007`.
- `AC-06`: Each declared target documents whether staging health checks, incremental rollout and recovery are supported, without claiming these capabilities for all targets. Evidence: stakeholder decision in `uc-open-01`; target inventory remains open in parent `open.item-001`.
- `AC-07`: Staging a version does not change production traffic. Evidence: [deployment behavior](../../actions/deploy/README.md).

**Tracking events**:

- `audit_sensitive_operation` (proposed event identifier): when a deployment action is designated sensitive, record actor, resource, time, outcome and applicable approvals without secrets. Channel: system; purpose: accountability; status: policy agreed, implementation and retention unverified. See `contracts.item-014` and parent `open.item-003`.
- Product analytics events are not inventoried; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Team as Service-owning team
      participant Delivery as Delivery capability
      participant Staging as Staged version
      participant Traffic as Production traffic
      Team->>Delivery: Select service version
      Delivery->>Staging: Stage version
      opt Incremental validation configured
          Delivery->>Traffic: Shift and validate in steps
      end
      alt Validation succeeds
          Delivery->>Traffic: Promote staged version
      else Validation fails and rollback is authorized, safe and verified
          Delivery->>Traffic: Restore previous path
      else Validation fails without verified safe rollback
          Delivery-->>Team: Report effects and reconciliation guidance
      end
      Delivery-->>Team: Rollout outcome
  ```

- Service Blueprint: [SB-05 Validate, release and publish](../service-blueprint.md#sb-05-validate-release-and-publish).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-005`, `solution.components.item-006`.
- Interface / data contract: `contracts.item-005`, `contracts.item-006`, `contracts.item-014`.
- Validation evidence: [deployment behavior](../../actions/deploy/README.md), [deployment action](../../actions/deploy/action.yml).

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Decision | Staging does not change production traffic. A configured incremental rollout validates each step; on failure, restore the previous path only when rollback is authorized, safe and verified. Health checks and incremental rollout are not mandatory for every target. | Per-target capability and safety evidence remain open; current documented behavior must be checked against the agreed rollback policy. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; [deployment behavior](../../actions/deploy/README.md); parent `open.item-001` and `open.item-007`. |
