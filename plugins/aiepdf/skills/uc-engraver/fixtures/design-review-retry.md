# DR-02 - Receipt access

Synthetic operational parent snapshot. `metadata.status`: draft;
`metadata.owner`: Payments engineering; `metadata.canonical-outcome-id`:
RECEIPT-ACCESS; `metadata.source-id`: design-review-retry.md.
`references.prd`: [PRD-saved-payments](prd-saved-payments.md), approved.

## Expected outcome and solution

Enable the authenticated payer to keep proof of a completed payment.
The mobile app calls the payment backend across HTTPS; no charging is in scope.
`solution.components.item-001`: payment backend, owns receipt authorization.
Domain: Payment is a completed, payer-owned transaction; Receipt is its PDF
evidence. A receipt read never changes Payment state.

## Non-functional requirements and contracts

`NFR-01`: p95 <= 500 ms; `NFR-02`: 99.9% availability target.
`contracts.item-001`: Payments API v1, `GET /payments/{id}/receipt`, authenticated
owner only, PDF on success. A timeout is retryable; a missing receipt is not.
No receipt contents in telemetry. Figma/blueprint: justified N/A in the linked PRD.

## Dynamic component view and Use Case index

| ID    | Title                    | Child page                                 |
| ----- | ------------------------ | ------------------------------------------ |
| UC-02 | Download payment receipt | [Child](uc-02-download-payment-receipt.md) |

This is the complete catalog. The existing child's root-level path is intentional;
update it in place rather than relocating it or allocating another UC ID.

## Execution, readiness, and propagation

Payments engineering owns PDF, ownership, and timeout tests. Production review
evidence remains TBD; no lifecycle promotion is requested.
`open.item-001`: the product owner's 2026-09-15
[retry decision](prd-saved-payments.md#confirmed-retry-addition) is propagated
into the API contract above but not yet into UC-02. Blocking: no for authoring;
owner: Payments engineering. No Jira items exist.
