---
id: UC-17
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-17`: Observe a service and generate operational dashboards

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Service-owning team.

**Secondary actors**: Operations team and service consumers.

**Source artifact**: [Operational dashboard](../../apps/opex-dashboard/README.md), [monitoring guidance](../../apps/website/docs/azure/monitoring/index.md) and [instrumentation maturity](../../apps/website/docs/azure/monitoring/azure-tracing.md).

**Service Blueprint step**: [SB-06 Observe and operate](../service-blueprint.md#sb-06-observe-and-operate).

**Domain entities**: Team, Service and release, Resource, Knowledge artifact.

**Trigger**: A team needs to observe a service and identify operational problems.

**Preconditions**:

- The service exposes the signals required by the chosen monitoring capability.
- A supported service interface description and dashboard configuration are available for the dashboard-generation scenario.

**Main flow**:

1. The team identifies the service, its interface description and its signal sources.
2. The dashboard capability generates a standardized operational view for the described endpoints.
3. The team configures applicable alert thresholds and makes the view available to operators.
4. Operators inspect service availability, response outcomes and response times.
5. The team investigates alerts and service issues using the available signals.

**Alternate flows**:

- `A1`: Teams use other documented signals, such as logs or traces, where the service and monitoring setup support them.
- `A2`: A documented instrumentation mode is experimental; a tracing library's beta designation applies until its first stable major release. These labels do not establish the maturity of every monitoring capability.

**Exception flows / edge cases**:

- `E1`: Required service description or dashboard configuration is invalid -> Error: `DASHBOARD_CONFIGURATION_INVALID`; do not publish the invalid dashboard.
- `E2`: Required signal data is unavailable -> Error: `SIGNAL_UNAVAILABLE`; display the signal as unknown or unavailable.

**Postconditions**:

- A generated dashboard represents the supported service endpoints and configured signals.
- A missing signal is shown as unknown or unavailable, not as evidence that the service is healthy or as a zero value.
- Invalid required inputs do not lead to publication of a new dashboard; implementation evidence remains unverified.
- This DR defines no performance objectives; supported response-time measurements and configurable operational alerts remain available.
- Operated DX services require documented procedures, alerts and escalation; current coverage remains unverified in parent `open.item-006`.

**Errors**:

- `DASHBOARD_CONFIGURATION_INVALID`: Required configuration or service description is invalid -> report the error and do not publish a new dashboard.
- `SIGNAL_UNAVAILABLE`: A required signal cannot be retrieved -> display an explicit unknown or unavailable state, not healthy or zero.

**Acceptance checks**:

- `AC-01`: For each endpoint in a supported service description, the generated view includes availability, response outcomes and response-time information. Evidence: [operational dashboard](../../apps/opex-dashboard/README.md).
- `AC-02`: The dashboard capability supports configurable availability and response-time alert thresholds. Evidence: [operational dashboard](../../apps/opex-dashboard/README.md).
- `AC-03`: Invalid required dashboard inputs produce `DASHBOARD_CONFIGURATION_INVALID` and no new dashboard is published. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.
- `AC-04`: When a required signal is unavailable, the dashboard reports `SIGNAL_UNAVAILABLE` and shows it as unknown or unavailable rather than healthy or zero. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.

**Tracking events**: Operational alerts are part of the dashboard scenario; product analytics tracking is not established, see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Team as Service-owning team
      participant Dashboard as Dashboard capability
      participant Service
      actor Operator
      Team->>Dashboard: Supply service description and configuration
      Dashboard-->>Team: Generated operational view
      Service-->>Dashboard: Supported signals
      Dashboard-->>Operator: Views and configured alerts
  ```

- Service Blueprint: [SB-06 Observe and operate](../service-blueprint.md#sb-06-observe-and-operate).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-006`.
- Interface / data contract: `contracts.item-007`.
- Cross-cutting NFR: `NFR-08` applies where DX provides human-facing web content; conformance evidence remains open in parent `open.item-006`.
- Validation evidence: [operational dashboard](../../apps/opex-dashboard/README.md); portable failure verification not supplied.

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Decision | Invalid required inputs block publication and produce an explicit error. Missing signals are shown as unknown or unavailable, not as healthy or zero. | The agreed behavior needs implementation and conformance evidence. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; parent `open.item-005`. |
