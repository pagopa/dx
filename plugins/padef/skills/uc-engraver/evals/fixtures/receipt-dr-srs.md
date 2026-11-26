---
id: DR-01
status: draft
---

# Receipt lookup DR/SRS

## References

- `references.prd`: [Receipt lookup PRD](receipt-prd.md)
- Service Blueprint: N/A - this API-only support workflow has no blueprint.
- Figma: N/A - no UI design artifact is required for this workflow.

## Domain model and glossary

- **Payment**: a payment identified by a payment reference.
- **Receipt**: the receipt for a Payment, either available or pending generation.

## Solution components

- `solution.components.item-001`: Receipt service. It retrieves a receipt by
  payment reference without modifying the Payment or Receipt.

## Contracts

- `contracts.item-001`: Receipt lookup API, operation `getReceipt`,
  `GET /payments/{paymentReference}/receipt`.
  - Preconditions: the Support operator is authenticated and authorized to
    access the payment reference.
  - `200`: the receipt is available; return the receipt download URL.
  - `202`: receipt generation is pending; return the pending state without a
    download URL.
  - `404`: the payment reference is unknown; report that the payment was not
    found.
  - Every outcome is read-only: neither Payment nor Receipt is changed.
  - Authorization enforcement is a precondition, outside this Use Case's scope.

## Use Case catalog

This is the complete catalog. The child has not been authored yet.

| ID      | Title                      | Child |
| ------- | -------------------------- | ----- |
| `UC-01` | Retrieve a payment receipt | TBD   |

## Tracking

N/A - product analytics events are explicitly out of scope for this support
workflow. Do not introduce new tracking events.

## Validation and readiness

The available, pending, and unknown-payment outcomes must be covered by binary
acceptance checks. No validation tests have been executed yet; mark evidence as
TBD and keep the child in draft status.

## Open questions and propagation

There are no unresolved behavior, actor, priority, contract, privacy, or tracking
decisions. The only remaining gap is unexecuted validation evidence.
