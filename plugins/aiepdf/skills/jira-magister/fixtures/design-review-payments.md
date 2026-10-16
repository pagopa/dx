# DR-01 - Saved cards and support receipts

Synthetic operational snapshot. `metadata.status`: draft;
`metadata.owner`: Payments engineering; `metadata.authors`: Payments engineering;
`metadata.canonical-outcome-id`: PAYMENT-SELF-SERVICE;
`metadata.source-id`: design-review-payments.md;
`metadata.last-updated`: 2026-09-15; `metadata.version`: 1.1.

## Header and references

- `references.prd`: [PRD-payments](prd-payments.md), approved.
- `references.repository`: https://github.com/example/saved-payments (synthetic target).
- `references.rfc`: N/A - no accepted RFC awaits propagation.
- `references.service-blueprint`, `references.figma`: [Design evidence](#design-evidence).
- `references.contracts`: [Payments API v1](#payments-api-v1).
- `references.reviews`, `references.dpia`: [Control evidence](#control-evidence).
- `references.launch-review`, `references.operations`: [Delivery evidence](#delivery-evidence).
- `references.glossary`: N/A - terms are defined below.
- Canonical parent URL snapshot: https://example.org/design-reviews/saved-payments.

## Expected outcome of the initiative

Two independent outcomes: saved-card selection and support receipt lookup.
Scope, non-goals, KPI targets, and guardrails are in the approved PRD.

## Solution design

Technology profile: existing HTTPS service, TypeScript on Azure; hosting changes
are excluded. Radar evidence is not provided; this is an explicit non-blocking
documentation gap, owned by Payments engineering, not a new technology decision.
System context: mobile payer client and support portal -> payment backend -> PSP
token validation or receipt store. The PSP is outside the application boundary.
`solution.components.item-001`: payment backend, owns payer card selection.
`solution.components.item-002`: receipt service, owns authorized support lookup.
Deployment: existing private backend and receipt store behind authenticated
HTTPS; no new runtime topology is part of these slices.

### Domain model and glossary

Saved card: payer-owned token reference and masked label, active or expired.
Payment session: unpaid payment with at most one selected Saved card.
Payment: settled, payer-owned transaction with a payment reference.
Receipt: immutable PDF proof of a Payment. Lookup is read-only; support access
is limited to authorized operators. Selection is not charging.

## Non-functional requirements and compliance

`NFR-01`: p95 <= 500 ms at 100 requests/second; `NFR-02`: monthly availability
target 99.9%. Verification plan: contract/load tests and service monitoring.
Security, privacy, accessibility, and tracking evidence is in the control snapshot.

## Dynamic component view and Use Case index

| ID    | Title                | Child page                             |
| ----- | -------------------- | -------------------------------------- |
| UC-01 | Select a saved card  | [UC-01](uc-01-select-saved-card.md)    |
| UC-02 | Find payment receipt | [UC-02](uc-02-find-payment-receipt.md) |

## Data and technical contracts

### Payments API v1

`contracts.item-001`: authenticated `PUT /payment-sessions/{id}/saved-card`;
owned active token -> 204; expired token -> 409, selection unchanged.
`contracts.item-002`: authorized `GET /support/receipts/{paymentReference}`;
PDF -> 200; missing -> 404; timeout -> 503, retryable once on explicit request.
Only read-only lookup is retried. The confirmed retry is propagated here and
into UC-02; binary acceptance checks remain on the children.
Data lifecycle: token references remain in the existing encrypted store until
card removal; receipt reads create no additional copy or retention period.

## Execution, validation, rollout, and readiness

### Design evidence

Synthetic design snapshot approved by Payments design: reuse existing card
selector and support lookup screen. Figma: N/A - no new visual design.
Blueprint steps: choose saved card; find receipt by payment reference.

### Control evidence

Synthetic readiness sign-offs: Payments security/privacy approve ownership and
support authorization checks, no PAN/token/receipt contents in logs, and unchanged
retention. Payments accessibility approves keyboard and screen-reader paths.
Tracking registry: `saved_card_selected` (mobile, selection KPI) and
`support_receipt_found` (web, lookup KPI), success only, correlation IDs only.

### Delivery evidence

`execution.repository-setup`: prepare service package in the linked repository;
verify package build. `execution.api-wiring`: wire API v1 contracts; verify
request/response contract tests. Each is a one-sprint enabling task.
Payments engineering owns these tasks and contract/load, authorization,
expired-card, not-found, and timeout test plans. Synthetic planning review
confirms these plans are sufficient for implementation; this is not evidence
that implementation tests have run. Support owns the existing lookup runbook.
Rollout: independent feature flags; rollback: disable the affected flag.
Launch review is a separate production gate, not approval to mutate Jira.
Ready children and source evidence satisfy the backlog gate; document status
remains draft and does not block their projection.

## Open questions, assumptions, decisions, and change propagation

No blocking questions. `open.item-001`: record missing Radar documentation;
Blocking: no; owner: Payments engineering; creates no Task or dependency.
The approved 2026-09-15 retry decision is propagated to `contracts.item-002` and
UC-02. The prior Jira projection, when supplied, still lacks the retry check.
