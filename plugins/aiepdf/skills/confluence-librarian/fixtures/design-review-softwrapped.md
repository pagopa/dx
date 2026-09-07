# Design Review — Idempotent Outcome Delivery

<!-- id: metadata -->

## Header and references

| ID | Value |
| --- | --- |
| `metadata.status` | draft |
| `metadata.title` | Design Review — Idempotent Outcome Delivery |
| `metadata.owner` | Platform Experience |
| `metadata.last-updated` | 2026-09-07 |
| `metadata.version` | 1.0 |

### Related artifacts

| ID | Artifact | Link or reference | Relationship / status |
| --- | --- | --- | --- |
| `references.prd` | PRD | https://pagopa.atlassian.net/wiki/spaces/PD/pages/42 | approved |
| `references.rfc` | RFC | https://pagopa.atlassian.net/browse/RFC-12 | N/A — not required for this change |
| `references.figma` | Prototype | https://www.figma.com/file/abc123/outcome-flow | N/A — no UI change |

<!-- id: expected-outcome -->

## Expected outcome of the initiative

The outcome API accepts PSP callbacks and must turn each logical payment into at most
one user-visible notification, even when the PSP retries the same delivery. Today a
retried webhook can enqueue two notifications because the worker has no way to recognize
that it already saw the event. This review selects an idempotency strategy at the ingest
boundary that keeps the existing public contract stable.

The intended outcome is exactly-once processing per PSP event id, with retried
deliveries answered from a stored result instead of re-enqueued, so the notification
funnel and the audit trail stay truthful.

| ID | Item | Description | Source / status |
| --- | --- | --- | --- |
| `outcome.context` | Context | Retried PSP deliveries can produce duplicate notifications | confirmed |
| `outcome.objective` | Expected outcome | Exactly-once processing per logical PSP event | confirmed |
| `outcome.non-goal` | Non-goal | Changing the public webhook contract or the channel adapters | confirmed |

<!-- id: solution-design -->

## Solution design

The gateway computes an idempotency key from the PSP delivery id and stores it in a
Redis-backed outcome store before the worker runs. A duplicate key returns the stored
response and is never re-enqueued, so at-least-once delivery from the PSP maps to
exactly-once processing inside the platform. The worker stays unchanged and the
deduplication is invisible to channel adapters.

| ID | Component | Owns / consumes | Notes | Status |
| --- | --- | --- | --- | --- |
| `solution.gateway` | Outcome gateway | Owns key derivation | computes the idempotency key | proposed |
| `solution.store` | Outcome store | Owns the dedup index | Redis with a 24h TTL | proposed |
| `solution.worker` | Outcome worker | Consumes ready events | unchanged | existing |

<details>
<summary>Record of decisions</summary>

- ADR-014 keys on the PSP delivery id, not on the payment id, because one payment can legitimately produce several deliveries.
- ADR-015 keeps the dedup window at 24 hours, aligned with the PSP retry budget.

</details>

> [!NOTE]
> Decisions are recorded in the ADR log; this section is a collapsible summary and must not be flattened into plain prose.

<!-- id: non-functional -->

## Non-functional requirements and compliance

| ID | Area | Requirement / target | Verification evidence | Status |
| --- | --- | --- | --- | --- |
| `nfr.performance` | Performance | p99 under 300 ms for duplicate detection | load test report | open |
| `nfr.availability` | Availability | 99.9% monthly uptime for the gateway | SLO dashboard | open |
| `nfr.security` | Security | delivery ids are not PII and are never logged | security review | accepted |
| `nfr.privacy` | Privacy | no payload retained beyond the dedup window | DPIA | N/A — no personal data stored |

<!-- id: open-questions -->

## Open questions, assumptions, and decisions

| ID | Type | Item | Resolution |
| --- | --- | --- | --- |
| `open.001` | question | Should the store fail open when Redis is unavailable? | TBD |
| `open.002` | assumption | The PSP retry budget never exceeds 24 hours | confirmed with PSP |


