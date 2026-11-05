---
id: UC-14
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-14`: Detect infrastructure drift

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Infrastructure team.

**Secondary actors**: Delivery automation and notification recipients.

**Source artifact**: [Drift detection workflow](../../.github/workflows/infra_drift_detection.yml) and [delivery overview](../../apps/website/docs/pipelines/index.md).

**Service Blueprint step**: [SB-06 Observe and operate](../service-blueprint.md#sb-06-observe-and-operate).

**Domain entities**: Environment, Resource, Infrastructure state, Plan, Change and validation result.

**Trigger**: A configured drift check runs for an environment.

**Preconditions**:

- The environment's declarations, state and read permissions are available.
- The configured notification destination is available.

**Main flow**:

1. Automation selects the environment and prepares a comparison plan.
2. Automation inspects the plan for proposed resource additions, changes and removals.
3. If differences are detected, the workflow reports their counts and invokes the configured notification path with execution context.
4. The responsible team reviews the differences and decides whether a separate change is needed.

**Alternate flows**:

- `A1`: If the plan has no relevant changes, the workflow reports that no drift was detected.

**Exception flows / edge cases**:

- `E1`: Planning fails -> Error: `DRIFT_CHECK_FAILED`.
- `E2`: Required plan inspection cannot complete -> Error: `DRIFT_RESULT_UNCERTAIN`; report a non-success outcome and alert the responsible owner.
- `E3`: The required alert cannot be delivered or its delivery cannot be verified -> Error: `NOTIFICATION_DELIVERY_FAILED`.

**Postconditions**:

- The check reports differences or the absence of relevant differences when analysis completes.
- The drift check does not itself apply infrastructure changes.
- An incomplete required inspection is `partial` or `failed`, never a no-drift result, and alerts the responsible owner. Notification-delivery failure is explicit; current workflow signaling remains to be verified.

**Errors**:

- `DRIFT_CHECK_FAILED`: The planning step fails -> the workflow reports an error instead of a valid no-drift result.
- `DRIFT_RESULT_UNCERTAIN`: Required analysis is incomplete -> report a non-success outcome and alert the responsible owner; do not claim no drift.
- `NOTIFICATION_DELIVERY_FAILED`: A required alert cannot be delivered or delivery cannot be verified -> report that failure explicitly without claiming delivery.

**Acceptance checks**:

- `AC-01`: Given a completed plan with changes, the documented workflow identifies additions, changes and removals and invokes the configured notification path. Evidence: [drift workflow](../../.github/workflows/infra_drift_detection.yml).
- `AC-02`: Given a completed plan with no relevant changes, the workflow reports no drift and does not apply a change. Evidence: [drift workflow](../../.github/workflows/infra_drift_detection.yml).
- `AC-03`: Given a planning failure, the planning step reports `DRIFT_CHECK_FAILED` instead of classifying the failed plan as no drift. Evidence: [drift workflow](../../.github/workflows/infra_drift_detection.yml).
- `AC-04`: If planning succeeds but the required inspection cannot complete, the outcome is `partial`, reports `DRIFT_RESULT_UNCERTAIN` and does not claim that no drift was detected. Evidence: [agreed outcome policy](../design-review.md#solution-design); current workflow verification remains in `uc-open-01`.
- `AC-05`: If required inspection cannot complete and the alert channel is available, the responsible owner receives an alert identifying the environment and incomplete outcome. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-007`.
- `AC-06`: If the required alert cannot be delivered or delivery cannot be verified, the outcome explicitly reports `NOTIFICATION_DELIVERY_FAILED` and does not claim successful delivery. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-007`.

**Tracking events**: Drift and failure notifications are operational messages in the [workflow](../../.github/workflows/infra_drift_detection.yml). An alert for incomplete inspection is required by the agreed decision, but current coverage is unverified. Analytics tracking is not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      participant Scheduler as Configured trigger
      participant Check as Drift check
      participant State as Infrastructure state
      actor Team as Infrastructure team
      Scheduler->>Check: Start environment check
      Check->>State: Prepare comparison plan
      State-->>Check: Proposed differences
      alt Inspection completes
          Check-->>Team: Drift notification or result
      else Inspection incomplete
          Check-->>Team: Non-success outcome and alert
      end
  ```

- Service Blueprint: [SB-06 Observe and operate](../service-blueprint.md#sb-06-observe-and-operate).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-004`, `solution.components.item-005`, `solution.components.item-012`.
- Interface / data contract: `contracts.item-004`, `contracts.item-006`.
- Validation evidence: [drift detection workflow](../../.github/workflows/infra_drift_detection.yml).

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Decision | An incomplete inspection produces `partial` or `failed`, never no-drift, and alerts the responsible owner; notification-delivery failure is explicit. | The current workflow continues after inspection errors; compliance with the agreed signaling and alert behavior remains unverified. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; [drift workflow](../../.github/workflows/infra_drift_detection.yml); parent `open.item-007`. |
