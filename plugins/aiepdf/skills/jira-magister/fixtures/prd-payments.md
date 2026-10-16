# PRD-payments - Saved cards and support receipts

Synthetic approved product snapshot, not live product data. Owner and approver:
Payments product owner; approved 2026-09-15. Outcome ID: PAYMENT-SELF-SERVICE.

| Actor                   | Job                                                         |
| ----------------------- | ----------------------------------------------------------- |
| Cittadino pagatore      | JTBD-01: reuse a saved card without entering card details   |
| Operatore di assistenza | JTBD-02: find a receipt to answer a payment support request |

| Outcome                | Scope                                                                          | KPI                                                     | Qualitative guardrail                                           |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------------- |
| Saved-card selection   | UC-01: select an owned active card                                             | 90% selection without re-entry in 30 days               | Never expose full card data                                     |
| Support receipt lookup | UC-02: retrieve an authorized receipt, including one explicit retry on timeout | 95% of authorized lookups return the receipt in 30 days | Never reveal another payer's receipt or change settled payments |

Charging, card registration, refunds, and receipt delivery channels are out of
scope. Each outcome is independently valuable and bounded to two two-week
sprints; each individual UC fits one sprint. Priority: Must for both UCs.
There is no delivery dependency between the outcomes.

## Confirmed behavior

UC-01: a signed-in payer opens saved cards for their unpaid payment session,
selects an active card, and sees its masked label associated with the session.
An expired card is rejected without changing the selection.

UC-02: an authorized support operator enters a payment reference and receives its
receipt PDF; a missing receipt is reported without changing the payment. The
2026-09-15 product decision adds one explicit retry after a lookup timeout:
repeat the same reference once; return the PDF on success, otherwise show the
timeout again. No automatic retry and no retry for a missing receipt.

Design and readiness snapshots are in [DR-01](design-review-payments.md).
Product/source approval does not authorize Jira creation or updates.
