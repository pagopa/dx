# DR-01 - Saved payments and receipts

Synthetic operational parent snapshot. `metadata.status`: draft;
`metadata.owner`: Payments engineering; `metadata.canonical-outcome-id`:
SAVED-PAYMENTS; `metadata.source-id`: design-review-saved-payments.md.

## Related artifacts

- `references.prd`: [PRD-saved-payments](prd-saved-payments.md), approved.
- `references.repository`: N/A - repository routing is outside child authoring.
- `references.rfc`: N/A - no RFC decisions affect this snapshot.
- Discovery and tracking: [PRD discovery evidence](prd-saved-payments.md#discovery-evidence).

## Expected outcome

Reuse a saved card, download a completed payment receipt, and remove an unwanted
saved card. Scope, actors, priorities, and confirmed behavior are in the PRD.
Charging, registration, and refunds are excluded.

## Solution design

### System context and components

The mobile app calls the authenticated payment backend, which validates PSP
tokens and retrieves receipts. The PSP is outside the application trust boundary.
`solution.components.item-001`: payment backend, owns saved-card selection and
removal plus receipt authorization; mobile app is its client.

### Domain model and glossary

- Saved card: payer-owned PSP token reference and masked label; active or expired.
- Payment session: an unpaid payment, owned by one payer, with at most one
  selected Saved card.
- Payment: completed transaction, owned by one payer, with a Receipt reference.
- Receipt: PDF evidence of a completed Payment; lookup never changes the Payment.
- Removal means deleting a saved token reference, not reversing a payment.

## Non-functional requirements and compliance

`NFR-01`: backend p95 <= 500 ms; `NFR-02`: availability target 99.9%.
Authentication and ownership checks apply to all calls. Never expose full card
data or log tokens/receipt contents. Review execution evidence is TBD with the
Payments engineering owner; child status must remain draft.

## Dynamic component view and Use Case index

| ID    | Title                    | Child page                                           |
| ----- | ------------------------ | ---------------------------------------------------- |
| UC-01 | Select a saved card      | [Child](use-cases/uc-01-select-saved-card.md)        |
| UC-02 | Download payment receipt | [Child](use-cases/uc-02-download-payment-receipt.md) |
| UC-03 | Remove a saved card      | [Child](use-cases/uc-03-remove-saved-card.md)        |

The child files are intentionally absent unless supplied explicitly for an
update scenario. The catalog is complete: no other UC IDs are allocated.

## Data and technical contracts

`contracts.item-001`: Payments API v1, OpenAPI snapshot. HTTPS with authenticated
payer identity; only owned resources are accessible:
`GET /saved-cards`, `PUT /payment-sessions/{id}/saved-card`,
`GET /payments/{id}/receipt` (PDF), `DELETE /saved-cards/{id}`.
Receipt timeout is retryable; missing receipt is not. See the PRD for observable
outcomes; do not invent wire codes. Sequence diagrams may be authored inline.

## Execution, validation, rollout, and readiness

Payments engineering owns contract tests, payer-isolation tests, synthetic PSP
timeouts, and PDF-response checks. Rollout uses the existing feature flag;
rollback disables it without changing settled payments. Test execution and
production readiness evidence remain TBD; this is an authoring input, not a
ready backlog or publication request.

## Open questions, assumptions, decisions, and change propagation

`open.item-001`: confirm production readiness evidence; Blocking: no for local
child drafting; owner: Payments engineering. The 2026-09-15 receipt retry decision
is propagated into the API snapshot above; its UC detail still needs updating.
No Jira items exist for these children.
