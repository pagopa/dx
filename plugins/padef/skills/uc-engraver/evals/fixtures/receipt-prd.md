---
id: PRD-01
status: ready
---

# Receipt lookup PRD

## Actor catalog

- **Support operator**: the primary actor, authenticated and authorized to
  retrieve a receipt by payment reference.
- Secondary actors: N/A - the Receipt service is a system component, not a
  second product actor.

## Jobs to be done

- `JTBD-01`: Find a payment receipt to answer a support request.

## Scope and confirmed behavior

- `UC-01`, **Retrieve a payment receipt**, priority **Should**.
- Trigger: the Support operator requests a receipt using a payment reference.
- Preconditions: the operator is authenticated, authorized for that payment
  reference, and has supplied the reference.
- The system calls the Receipt service using `getReceipt`.
- When the receipt is available, show its download URL.
- When receipt generation is pending, show that the receipt is not yet
  available and provide no download URL.
- When the payment reference is unknown, show that the payment was not found
  and provide no download URL.
- The workflow never modifies a Payment or Receipt.
- Service Blueprint and Figma: N/A - this API-only support workflow has no
  blueprint or UI design artifact.
- Tracking events: N/A - product analytics are explicitly out of scope.
- Retries, receipt generation, and authorization failures are outside this
  Use Case's scope.

## Validation

No tests have been executed. Keep validation evidence explicitly TBD rather
than claiming the behavior is verified.
