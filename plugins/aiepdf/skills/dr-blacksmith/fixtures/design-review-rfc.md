# Design Review / Software Requirements Specification — Notifications delivery

| ID                              | Value                  |
| ------------------------------- | ---------------------- |
| `metadata.status`               | draft                  |
| `metadata.title`                | Notifications delivery |
| `metadata.canonical-outcome-id` | NOTIFICATIONS-DELIVERY |
| `metadata.source-id`            | doc-770001             |
| `metadata.owner`                | Notifications team     |
| `metadata.authors`              | Notifications team     |
| `metadata.last-updated`         | 2026-09-01             |
| `metadata.version`              | 1.0                    |

### Related artifacts

| ID                     | Artifact                           | Link or reference                  | Relationship / status   |
| ---------------------- | ---------------------------------- | ---------------------------------- | ----------------------- |
| `references.prd`       | PRD                                | prd-notifications.md               | source                  |
| `references.rfc`       | RFCs                               | RFC-07 — event notifications       | accepted                |
| `references.contracts` | OpenAPI / AsyncAPI / Data Contract | notifications-api.yaml             | current synchronous API |
| `references.reviews`   | Security / Privacy / Legal reviews | internal service, no personal data | N/A — reason            |

## Expected outcome of the initiative

Deliver payment outcome notifications to citizens through a reliable and
observable channel. In scope: notification dispatch and delivery status. Out of
scope: notification content authoring.

## Solution design

### System context and dependencies

| ID                          | Component / dependency | Responsibility            | Interface or trust boundary        | Status    |
| --------------------------- | ---------------------- | ------------------------- | ---------------------------------- | --------- |
| `solution.context.item-001` | Notification service   | Sends notifications       | HTTPS to the notification provider | confirmed |
| `solution.context.item-002` | Payment core           | Emits the payment outcome | internal queue                     | confirmed |

### Static component view

The current design calls the notification provider **synchronously** from the
payment outcome handler. A provider timeout delays the outcome response.

## Non-functional requirements and compliance

| ID       | Area               | Requirement / target          | Verification evidence | Owner              | Status    |
| -------- | ------------------ | ----------------------------- | --------------------- | ------------------ | --------- |
| `NFR-01` | Performance        | Outcome handling p95 < 500 ms | load test             | Notifications team | confirmed |
| `NFR-02` | Availability / SLO | 99.9%                         | monitoring            | Notifications team | confirmed |

## Dynamic component view and Use Case index

| ID      | Title                     | Source artifact | Linked JTBD | Priority | Status / gap | Child page                        |
| ------- | ------------------------- | --------------- | ----------- | -------- | ------------ | --------------------------------- |
| `UC-01` | Notify payment outcome    | PRD             | JTBD-01     | Must     | ready        | use-cases/uc-01-notify-outcome.md |
| `UC-02` | Retry failed notification | PRD             | JTBD-02     | Should   | candidate    | TBD                               |

## Data and technical contracts

| ID                   | Contract / entity | Type    | Owner              | Version / compatibility | Link                   | Status               |
| -------------------- | ----------------- | ------- | ------------------ | ----------------------- | ---------------------- | -------------------- |
| `contracts.item-001` | Notifications API | OpenAPI | Notifications team | v1                      | notifications-api.yaml | current, synchronous |

## Execution, validation, rollout, and readiness

### Definition of Ready

| ID                      | Criterion                                              | Evidence / status  |
| ----------------------- | ------------------------------------------------------ | ------------------ |
| `ready.rfc-propagation` | Accepted RFC decisions are propagated into this DR/SRS | _<evidence / gap>_ |

## Open questions, assumptions, decisions, and change propagation

| ID              | Type       | Item                                            | Impact / blocker | Owner              | Decision or propagation date | Resolution / link |
| --------------- | ---------- | ----------------------------------------------- | ---------------- | ------------------ | ---------------------------- | ----------------- |
| `open.item-001` | assumption | Notification provider supports idempotency keys | medium           | Notifications team | TBD                          | TBD               |
