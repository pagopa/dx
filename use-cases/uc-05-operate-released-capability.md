---
title: "Operate and monitor a released capability using lifecycle evidence"
id: UC-05
status: candidate
---

# `UC-05` - Operate and monitor a released capability using lifecycle evidence

## Traceability

| Field | Value |
| --- | --- |
| `uc.id` | `UC-05` |
| `uc.title` | Operate and monitor a released capability using lifecycle evidence |
| `uc.status` | candidate |
| `uc.priority` | Should |
| `uc.linked-jtbd` | `objectives.jtbd.item-005` |
| `uc.parent-dr` | [Local Design Review](../design-review.md); [Confluence Design Review](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206840661) |
| `uc.source-artifact` | [PRD](../prd.md); [Confluence PRD](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206414774) |
| `uc.service-blueprint-step` | N/A - no Service Blueprint was supplied; the pilot workflow discovery is still open |

## Actors

| Role | Actor name from PRD | Responsibility |
| --- | --- | --- |
| Primary actor | SRE or Operations practitioner | Confirm operational expectations, monitor the released capability, investigate anomalies, and coordinate recovery. |
| Secondary actor | AI agent | Consume approved operational signals and support monitoring or recovery within explicitly approved boundaries. |

## Behavior contract

**Trigger**: A participating product capability is released with its operational expectations and monitoring evidence available.

**Preconditions**:

- The release has linked operational expectations, service ownership, monitoring signals, and applicable recovery information.
- Monitoring and alerting are available for the participating service or the gap is explicitly recorded.
- The scope of agent-led monitoring, automatic recovery, authorization, and human escalation is not yet confirmed.

**Main flow**:

1. SRE or Operations practitioner confirms that the released capability has the operational evidence required for monitoring.
2. The monitoring capability activates the agreed signals, dashboards, logs, metrics, traces, and alerts.
3. SRE or Operations practitioner reviews service behavior and operational completeness against the release evidence.
4. When an anomaly is detected, the monitoring capability creates an operational event with the affected service, signal, timestamp, and available context.
5. SRE or Operations practitioner investigates the anomaly and coordinates the approved response or recovery procedure.
6. If agent-led response is explicitly approved for the affected capability, AI agent proposes or executes only the authorized recovery action and records its provenance.
7. SRE or Operations practitioner confirms service state, records the outcome, and propagates any operational learning to the relevant contract or runbook.

**Alternate flows**:

- `A1`: If required monitoring evidence is missing, SRE or Operations practitioner records an operational readiness gap and the capability is not represented as fully ready.
- `A2`: If an alert is non-actionable or a known false positive, SRE or Operations practitioner records the disposition and updates the monitoring decision through the approved process.
- `A3`: If no agent-led response is approved, all recovery actions remain human-operated.

**Exception flows / edge cases**:

- `E1`: If monitoring is unavailable, the system records an observability failure and escalates according to a runbook that is not yet supplied.
- `E2`: If an agent proposes an action outside its authorization boundary, the action is rejected and escalated to SRE or Operations practitioner.
- `E3`: If automatic recovery is attempted and does not restore stable operation, the response falls back to the approved human recovery procedure; exact retry and escalation rules are TBD.
- `E4`: If the service owner, recovery objective, or relevant operational contract is missing, the incident remains open until ownership and impact are established.

**Postconditions**:

- Operational signals, anomalies, actions, approvals, and outcomes are traceable to the released capability and its lifecycle evidence.
- The capability is represented as operationally ready, degraded, recovered, or blocked, with ownership and unresolved gaps visible.

## Acceptance checks

Each check must be binary, independently verifiable, and stable across
updates. Link it to evidence or a test when available.

- `AC-UC-05-01`: A released capability cannot be represented as operationally ready when required monitoring or ownership evidence is missing. - Evidence: Operational readiness checklist TBD
- `AC-UC-05-02`: Every detected anomaly records the affected capability, signal, timestamp, and operational disposition. - Evidence: Monitoring / audit contract TBD
- `AC-UC-05-03`: No agent-led production action is executed unless its authorization boundary and human escalation policy have been approved for the capability. - Evidence: Security and Operations review TBD
- `AC-UC-05-04`: An unsuccessful recovery attempt leaves the capability in a visible degraded or blocked state and exposes the approved human recovery path. - Evidence: Recovery exercise TBD
- `AC-UC-05-05`: Operational outcomes can be traced back to the release evidence and can produce an update to the relevant contract or runbook. - Evidence: Traceability test TBD

## Tracking events

| Event ID / name | Trigger or flow step | Channel / source | Purpose | Status |
| --- | --- | --- | --- | --- |
| `operations_readiness_checked` | Main flow step 1 | Release / operations system | Measure operational completeness at release. | Proposed |
| `operations_monitoring_activated` | Main flow step 2 | Monitoring system | Measure monitoring coverage and activation. | Proposed |
| `operations_anomaly_detected` | Main flow step 4 | Monitoring / observability | Measure anomalies and incident lead time. | Proposed |
| `operations_recovery_started` | Main flow step 5 or 6 | Operations / agent audit | Trace response ownership and recovery actions. | Proposed |
| `operations_recovery_completed` | Main flow step 7 | Operations / audit | Measure recovery outcome and service stability. | Proposed |
| `operations_agent_action_blocked` | Exception flow E2 | Agent audit / security | Monitor authorization-boundary violations. | Proposed |

## Relevant links

- Sequence diagram: TBD
- Figma / design flow: N/A - this Use Case concerns operational readiness and monitoring rather than a user-facing design flow
- Endpoint / OpenAPI / AsyncAPI / Data Contract: TBD - monitoring, incident, audit, and recovery contracts are not defined
- Validation evidence: TBD

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Question | Is agent-led automatic production restoration in the initial scope or a later capability? | Changes the behavior, authorization model, and operational risk. | TBD | PRD `open-questions.item-011` |
| `uc-open-02` | Question | Which operational signals, SLOs, recovery objectives, and service ownership fields are mandatory in the release contract? | Blocks operational readiness and monitoring validation. | TBD | PRD `open-questions.item-005` |
| `uc-open-03` | Question | What are the approved agent permissions, human approval points, retry rules, and escalation paths for production actions? | Blocks Security and Operations approval. | TBD | PRD `open-questions.item-008` |
| `uc-open-04` | Question | Which dashboard, incident system, runbook, and support APIs are authoritative? | Blocks tracking, recovery, and support readiness. | TBD | PRD support-readiness section |
| `uc-open-05` | Assumption | Human SRE or Operations practitioner remains accountable for operational outcomes even when an agent assists. | Defines accountability and audit requirements. | TBD | PRD `objectives.jtbd.item-005` |
