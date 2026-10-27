# Existing PAY projection - before retry synchronization

Synthetic current Jira snapshot for project PAY, board PAY Planning.
Use this snapshot without remote calls. Types Epic/Story/Task, Epic parent and
`blocks` supported; no additional required fields. Product/source approval is
not approval to write Jira.

## PAY-20 - Find receipts for support

Type: Epic. Status: In Progress. Labels: payments, support. Owner: Payments team.
Scope: UC-02 only; exclude refunds and receipt delivery channels. Two-sprint
boundary. KPI: 95% of authorized lookups return the receipt in 30 days.
Guardrail: no unauthorized receipt access or settled-payment changes.
Source: DR-01 | PRD-payments/JTBD-02 | UC-02

Remote links: DR-01 - https://example.org/design-reviews/saved-payments;
PRD-payments - https://example.org/prds/payments.

## PAY-21 - Existing receipt lookup Story

Type: Story. Parent: PAY-20. Status: In Progress. Labels: payments, support.
Assignee: Support implementation owner. Priority: High. Estimate: 3 story points.
Summary: As a Operatore di assistenza, I want to find a payment receipt, so that
I can answer a payment support request.

Description: Authorized lookup by payment reference returns a receipt PDF.
Support handover note: retain the existing operator guide link.

- `AC-UC-02-01`: An authorized lookup of a reference with a receipt returns its PDF.
- `AC-UC-02-02`: An authorized lookup of a reference without a receipt shows
  `RECEIPT_NOT_FOUND` and leaves the Payment unchanged.

Source: DR-01 | PRD-payments/JTBD-02 | UC-02 | AC-UC-02-01 | AC-UC-02-02

Remote links: DR-01 - https://example.org/design-reviews/saved-payments;
UC-02 - https://example.org/use-cases/find-payment-receipt.

This is the complete existing projection for the selected UC-02. Match PAY-21
by its UC/source IDs and PAY-20 parent; do not create another Story or Epic.
Only `AC-UC-02-03` from [current UC-02](uc-02-find-payment-receipt.md) and its
retry description/source traceability are absent. All other issue fields,
acceptance meanings, remote links, and non-projection notes are unchanged.
