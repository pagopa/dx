---
id: UC-08
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-08`: Plan and provision infrastructure

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer or coding agent.

**Secondary actors**: Cloud account owner, approval authority and delivery automation.

**Source artifact**: [Infrastructure orchestration](../../packages/nx-terraform-plugin/README.md), [protected environments](../../infra/modules/github_environment_bootstrap/README.md) and [protected plan transfer](../../actions/terraform-plan-upload/README.md).

**Service Blueprint step**: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).

**Domain entities**: Workspace, Environment, Cloud account, Resource, Infrastructure state, Plan, Principal and permission.

**Trigger**: A team needs to create or change infrastructure in an environment.

**Preconditions**:

- The target environment, resource declarations and state access are available.
- The execution identity has the required scope and any configured approval policy is known.
- The data-owning team determines classification and retention for state and plan data under applicable policies; concrete assignments and periods remain open in parent `open.item-003`.
- If infrastructure state has been restored, it must be reconciled with actual resources before further changes; implementation and recovery evidence remain open in parent `open.item-004`.

**Main flow**:

1. The actor selects the target environment and declares the intended resource change using supported reusable abstractions.
2. The orchestration initializes the relevant infrastructure context and prepares a plan.
3. The actor or configured automation reviews the proposed change and obtains any required approval.
4. The authorized execution applies the selected change and reports its outcome.
5. The infrastructure state reflects the completed operation.

**Alternate flows**:

- `A1`: In the documented automated configuration, initialization checks that locked dependencies match the recorded lock before planning or applying.
- `A2`: A saved plan is protected during transfer and can be applied by the supported automated flow.
- `A3`: An authorized local flow can request interactive approval where supported.
- `A4`: After restoring infrastructure state, the team reconciles it with actual resources before making further changes.

**Exception flows / edge cases**:

- `E1`: A frozen dependency lock differs from the resolved dependencies -> Error: `DEPENDENCY_LOCK_MISMATCH`.
- `E2`: The execution identity lacks required authority -> Error: `ACTION_UNAUTHORIZED`.
- `E3`: A configured approval is absent -> Error: `APPROVAL_REQUIRED`.
- `E4`: Planning or application fails -> Error: `INFRASTRUCTURE_CHANGE_FAILED`.
- `E5`: Restored infrastructure state has not been reconciled with actual resources -> Error: `STATE_RECONCILIATION_REQUIRED`.

**Postconditions**:

- A successful application reports completion; preparing a plan alone does not apply the change.
- A failure does not imply that previously completed changes have been rolled back; see parent `open.item-007`.
- The agreed security baseline excludes secret values from outputs and logs. The documented interactive path inherits output without filtering, so compliance across all paths remains unverified: [execution guidance](../../packages/nx-terraform-plugin/README.md), parent `open.item-003`.
- The agreed outcome policy reports `partial` when required steps have both completed and remained incomplete, including known or uncertain effects; current coverage remains unverified.
- Automatic retries are bounded and allowed only for transient failures when repetition is safe. Verify or reconcile uncertain effects before retrying; implementation coverage remains unverified.
- Automatic rollback requires authorization, safety and verification; otherwise stop and report effects and reconciliation guidance. Current implementation coverage remains unverified.

**Errors**:

- `DEPENDENCY_LOCK_MISMATCH`: A frozen initialization finds different dependencies -> the supported automated flow stops before plan or apply.
- `ACTION_UNAUTHORIZED`: The execution identity lacks required permission -> the protected operation does not proceed.
- `APPROVAL_REQUIRED`: A configured approval has not been granted -> the protected operation remains pending.
- `INFRASTRUCTURE_CHANGE_FAILED`: Planning or application fails -> the actor receives a failure and must inspect the target state before retrying.
- `STATE_RECONCILIATION_REQUIRED`: Restored state has not been reconciled -> further infrastructure changes are blocked until reconciliation; enforcement evidence remains pending.

**Acceptance checks**:

- `AC-01`: Given valid declarations and state access, planning reports proposed resource changes without applying them. Evidence: [infrastructure orchestration](../../packages/nx-terraform-plugin/README.md).
- `AC-02`: Given a stale frozen dependency lock, automated initialization reports `DEPENDENCY_LOCK_MISMATCH` and stops before plan or apply. Evidence: [lock behavior](../../packages/nx-terraform-plugin/README.md).
- `AC-03`: For an environment configured with an approval gate, an unapproved application cannot pass that gate and is classified as `APPROVAL_REQUIRED`. Evidence: [protected environments](../../infra/modules/github_environment_bootstrap/README.md).
- `AC-04`: In the documented saved-plan transfer flow, the retained plan artifact is encrypted. Evidence: [protected plan transfer](../../actions/terraform-plan-upload/README.md).
- `AC-05`: Given restored state that has not been reconciled with actual resources, further changes remain blocked as `STATE_RECONCILIATION_REQUIRED`. Evidence: [agreed recovery guardrail](../design-review.md#solution-design); implementation verification remains in `open.item-004`.
- `AC-06`: If an infrastructure change fails after another required step succeeds, the result is `partial`, reports `INFRASTRUCTURE_CHANGE_FAILED` and identifies known or uncertain effects. Evidence: [agreed outcome policy](../design-review.md#solution-design); implementation verification remains in `open.item-007`.
- `AC-07`: If an apply fails with uncertain effects, no automatic retry occurs until the state has been verified or reconciled, and the uncertainty is reported. Evidence: [agreed retry policy](../design-review.md#solution-design); implementation verification remains in `open.item-007`.
- `AC-08`: If `INFRASTRUCTURE_CHANGE_FAILED` and rollback is not authorized, safe and verified, the operation stops and reports known or uncertain effects and reconciliation guidance. Evidence: [agreed rollback policy](../design-review.md#solution-design); implementation verification remains in `open.item-007`.

**Tracking events**:

- `audit_sensitive_operation` (proposed event identifier): when an infrastructure action is designated sensitive, record actor, resource, time, outcome and applicable approvals without secrets. Channel: system; purpose: accountability; status: policy agreed, implementation and retention unverified. See `contracts.item-014` and parent `open.item-003`.
- Product analytics events are not inventoried; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Consumer as Developer or agent
      participant Delivery as Infrastructure orchestration
      participant State as Infrastructure state
      participant Gate as Applicable approval
      participant Cloud as Cloud resources
      Consumer->>Delivery: Submit resource declarations
      Delivery->>State: Read current state
      Delivery-->>Consumer: Proposed plan
      Delivery->>Gate: Check required approval
      Gate-->>Delivery: Authorized
      Delivery->>Cloud: Apply selected change
      Delivery-->>Consumer: Outcome
  ```

- Service Blueprint: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-004`, `solution.components.item-005`, `solution.components.item-012`.
- Interface / data contract: `contracts.item-004`, `contracts.item-005`, `contracts.item-014`.
- Validation evidence: [infrastructure orchestration](../../packages/nx-terraform-plugin/README.md), [protected environments](../../infra/modules/github_environment_bootstrap/README.md).

## Open questions and propagation

Authorization scope, portable contracts and partial-failure recovery are
tracked in parent `open.item-002`, `open.item-005` and `open.item-007`. No
additional behavior-local question has been identified.
