## Header and references

| ID | Value |
| --- | --- |
| `metadata.status` | draft |
| `metadata.title` | Design Review — Idempotent Outcome Delivery |
| `metadata.owner` | Platform Experience |
| `metadata.last-updated` | 2026-09-09 |
| `metadata.version` | 1.2 |

## Related artifacts

| ID | Artifact | Link or reference | Relationship / status |
| --- | --- | --- | --- |
| `references.prd` | PRD | [PRD](https://pagopa.atlassian.net/wiki/spaces/PD/pages/42) | approved |
| `references.rfc` | RFC | [RFC-12](https://pagopa.atlassian.net/browse/RFC-12) | N/A — not required for this change |
| `references.adr-014` | ADR-014 | [ADR-014](https://pagopa.atlassian.net/browse/ADR-014) | proposed |
| `references.adr-015` | ADR-015 | [ADR-015](https://pagopa.atlassian.net/browse/ADR-015) | proposed |
| `references.figma` | Service blueprint | [Figma](https://www.figma.com/file/outcome-flow) | N/A — no UI change |
| `references.openapi` | OpenAPI outcome | [openapi.yaml](https://github.com/pagopa/dx/blob/main/openapi/outcome.yaml) | current |
| `references.grafana` | Delivery dashboard | [Grafana](https://pagopa.grafana.net/d/outcome-delivery) | current |

## Expected outcome of the initiative

The outcome API accepts PSP callbacks and must turn each logical payment into at
most one user-visible notification, even when the PSP retries the same delivery.
Today a retried webhook can enqueue two notifications because the worker has no
way to recognize that it already saw the event. The intended outcome is
exactly-once processing per logical PSP event, with retried deliveries answered
from a stored result instead of re-enqueued, so the notification funnel and the
audit trail stay truthful.

| ID | Item | Description | Source / status |
| --- | --- | --- | --- |
| `outcome.context` | Context | Retried PSP deliveries can produce duplicate notifications | confirmed |
| `outcome.objective` | Expected outcome | Exactly-once processing per logical PSP event | confirmed |
| `outcome.non-goal` | Non-goal | Changing the public webhook contract or the channel adapters | confirmed |
| `outcome.scope` | In scope | Outcome ingest API, dedup store, worker scheduling | confirmed |
| `outcome.out-of-scope` | Out of scope | Channel adapters, delivery preferences, template engine | confirmed |
| `outcome.metric` | Success metric | Duplicate user notifications per 10k deliveries < 1 | confirmed |
| `outcome.rollout` | Rollout gate | Shadow mode for two weeks before enforcement | open |

## Solution design

The gateway computes an idempotency key from the PSP delivery id and stores it
in a Redis-backed outcome store before the worker runs. A duplicate key returns
the stored response and is never re-enqueued. The worker stays unchanged and the
deduplication is invisible to channel adapters.

| ID | Component | Owns / consumes | Notes | Status |
| --- | --- | --- | --- | --- |
| `solution.gateway` | Outcome gateway | Owns key derivation | computes the idempotency key | proposed |
| `solution.store` | Outcome store | Owns the dedup index | Redis with a 24h TTL | proposed |
| `solution.worker` | Outcome worker | Consumes ready events | unchanged | existing |
| `solution.ingest` | Ingest API | Receives signed PSP callbacks | validates the payload signature | existing |
| `solution.queue` | Delivery queue | Buffers deliveries | at-least-once semantics preserved | existing |
| `solution.audit` | Audit trail | Records attempts and results | exactly-once per processed event | existing |

<details>
<summary>Record of decisions</summary>

- ADR-014 keys on the PSP delivery id, not on the payment id, because one payment
  can legitimately produce several deliveries.
- ADR-015 keeps the dedup window at 24 hours, aligned with the PSP retry budget.
- ADR-016 sets the outcome store TTL equal to the dedup window.
- ADR-017 stores only the response envelope, never the request payload.

</details>

> [!NOTE]
> Decisions are recorded in the ADR log; this section is a collapsible summary
> and must not be flattened into plain prose.

### Idempotency key derivation

| ID | Field | Source | Example |
| --- | --- | --- | --- |
| `key.delivery-id` | PSP delivery id | callback header `x-delivery-id` | `psp-2026-09-01-0001` |
| `key.channel` | Ingest channel | fixed per endpoint | `psp-outcome` |
| `key.version` | Key scheme version | constant | `v1` |
| `key.salt` | Per-environment salt | config, never logged | `<redacted>` |
| `key.algorithm` | Hash | SHA-256 over the joined fields | hex digest |

### Store semantics

| ID | Operation | Behaviour |
| --- | --- | --- |
| `store.setnx` | First delivery | insert key, enqueue once |
| `store.get` | Duplicate delivery | return stored response, do not enqueue |
| `store.ttl` | Expiry | 24h sliding window |
| `store.partial` | Partial failure | stored response without enqueue is retried by a sweeper |
| `store.capacity` | Sizing | peak 300 msg/s, headroom 2x |

## Data model and contracts

### Outcome event

| ID | Field | Type | Notes |
| --- | --- | --- | --- |
| `event.id` | Event identifier | `uuid` | generated at ingest |
| `event.deliveryId` | PSP delivery id | `string` | source of the idempotency key |
| `event.paymentId` | Logical payment id | `string` | one payment may map to many deliveries |
| `event.psp` | PSP identifier | `string` | enum, validated |
| `event.status` | Outcome status | `enum` | success, failure, timeout |
| `event.amount` | Amount | `integer` | minor units |
| `event.currency` | Currency | `string` | ISO 4217 |
| `event.channel` | Destination channel | `string` | app, email, sms |
| `event.receivedAt` | Ingest timestamp | `date-time` | UTC |
| `event.processedAt` | Processing timestamp | `date-time` | UTC, nullable |
| `event.attempt` | Delivery attempt | `integer` | 1-based |

### Outcome response envelope

| ID | Field | Type | Notes |
| --- | --- | --- | --- |
| `resp.id` | Response identifier | `uuid` | returned on duplicates too |
| `resp.status` | HTTP status | `integer` | 201 on first, 200 on duplicate |
| `resp.body` | Stored body | `object` | exactly the first response |
| `resp.notificationId` | Notification id | `uuid` | nullable on failure |
| `resp.storedAt` | Store timestamp | `date-time` | UTC |

## Non-functional requirements and compliance

| ID | Area | Requirement / target | Verification evidence | Status |
| --- | --- | --- | --- | --- |
| `nfr.performance` | Performance | p99 under 300 ms for duplicate detection | load test report | open |
| `nfr.availability` | Availability | 99.9% monthly uptime for the gateway | SLO dashboard | open |
| `nfr.security` | Security | delivery ids are not PII and are never logged | security review | accepted |
| `nfr.security.signature` | Security | callback signature validated before dedup | pen test report | accepted |
| `nfr.privacy` | Privacy | no payload retained beyond the dedup window | DPIA | N/A — no personal data stored |
| `nfr.resilience` | Resilience | store outage fails open with dedup suspended | chaos test report | open |
| `nfr.observability` | Observability | dedup hits/misses and store latency exported | Grafana dashboard | accepted |
| `nfr.capacity` | Capacity | 2x headroom over peak 300 msg/s | capacity plan | accepted |
| `nfr.cost` | Cost | Redis memory within 5 GiB at peak TTL | cost model | open |

## Rollout and rollback

| ID | Step | Description | Gate |
| --- | --- | --- | --- |
| `rollout.1` | Shadow mode | dedup records but does not suppress | 1 week, no regressions |
| `rollout.2` | Canary | suppress on 5% of deliveries | duplicate notifications drop |
| `rollout.3` | Ramp | 25%, 50%, 100% | SLOs green each step |
| `rollout.4` | Enforcement | full suppression | 2 weeks stable |
| `rollback.1` | Feature flag off | dedup suspended, store drained | immediate |
| `rollback.2` | Drain | keys expired, no residual state | within TTL |

## Validation strategy

| ID | Check | Type | Owner |
| --- | --- | --- | --- |
| `validation.1` | key derivation unit tests | unit | gateway team |
| `validation.2` | duplicate suppression integration | integration | worker team |
| `validation.3` | store failure injection | chaos | SRE |
| `validation.4` | load test at 2x peak | performance | QA |
| `validation.5` | signature rejection matrix | security | security team |
| `validation.6` | shadow vs enforcement parity | analytics | data team |

## Monitoring

| ID | Metric | Source | Alert |
| --- | --- | --- | --- |
| `mon.1` | dedup hit rate | gateway | threshold 20% |
| `mon.2` | dedup miss latency p99 | gateway | > 300 ms |
| `mon.3` | store error rate | store | > 0.1% |
| `mon.4` | duplicate notifications | funnel | > 1 per 10k |
| `mon.5` | store memory | Redis | > 80% |

## Use Case index

| ID | Title | Linked JTBD | Priority |
| --- | --- | --- | --- |
| `UC-01` | PSP retries a delivery | Get a payment outcome to the user | high |
| `UC-02` | Duplicate arrives after dedup window | Get a payment outcome to the user | medium |
| `UC-03` | Store is unavailable | Get a payment outcome to the user | high |
| `UC-04` | Outcome is a failure | Get a payment outcome to the user | high |
| `UC-05` | Signature is invalid | Protect the ingest boundary | high |
| `UC-06` | Delivery reaches the wrong channel | Get a payment outcome to the user | low |

## Open questions, assumptions, and decisions

| ID | Type | Item | Resolution |
| --- | --- | --- | --- |
| `open.001` | question | Should the store fail open when Redis is unavailable? | TBD |
| `open.002` | assumption | The PSP retry budget never exceeds 24 hours | confirmed with PSP |
| `open.003` | question | Is a sliding or fixed TTL preferred? | open |
| `open.004` | question | Should the key scheme version live in the key or the endpoint? | open |
| `open.005` | decision | Dedup is applied at the outcome ingest boundary | approved in review 2026-08-21 |
| `open.006` | decision | The public webhook contract stays unchanged | approved in review 2026-08-21 |
| `open.007` | assumption | Duplicate responses are idempotent for the PSP | to confirm with PSP |
| `open.008` | question | Do we need a per-PSP key namespace? | open |
