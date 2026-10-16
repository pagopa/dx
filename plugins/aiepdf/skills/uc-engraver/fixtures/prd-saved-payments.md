# PRD-saved-payments - Saved payments and receipts

Synthetic approved source snapshot, owned by this eval suite. Product owner:
Saved Payments product owner; approval date: 2026-09-01. Outcome: returning
payers can reuse a card and keep payment evidence. Primary actor:
**Cittadino pagatore**. Secondary actors: N/A - no other product actor participates
in these flows; the PSP and backend are system dependencies.

| ID      | Job to be done                                   | Priority | Behavior source |
| ------- | ------------------------------------------------ | -------- | --------------- |
| JTBD-01 | Reuse a saved card without entering card details | Must     | UC-01 below     |
| JTBD-02 | Keep proof of a completed payment                | Must     | UC-02 below     |
| JTBD-03 | Remove a card that should no longer be offered   | Should   | UC-03 below     |

KPI: 90% of eligible returning payers select a saved card without re-entry
within 30 days. Guardrails: no full card data exposure; no change to settled
payments when managing cards. New-card registration and charging are out of scope.

## UC-01 source behavior

The signed-in payer opens card selection in an unpaid payment session. Show
only their active saved cards with masked labels. Selecting one validates its
PSP token and associates it with that session; confirmation shows the masked
label. An empty list offers the existing new-card route without creating a
selection. An expired token produces `SAVED_CARD_EXPIRED`; PSP unavailability
produces `SAVED_CARD_UNAVAILABLE`. Neither failure changes the session selection.
Track `saved_card_selected` on successful selection, mobile channel, for KPI
measurement, without card or token data.

## UC-02 source behavior

The signed-in payer opens a completed payment and requests its receipt. The
backend checks ownership and returns a PDF. A missing receipt produces
`RECEIPT_NOT_FOUND`; a generation timeout produces `RECEIPT_UNAVAILABLE`.
Neither failure changes the completed payment. Track `receipt_downloaded` only
after a successful PDF response, mobile channel, for receipt-access monitoring.

### Confirmed retry addition

On 2026-09-15 the product owner approved a retry button after
`RECEIPT_UNAVAILABLE`. One explicit click repeats the same receipt request once.
Success downloads the PDF; another timeout leaves the error visible and keeps
the payment unchanged. Do not retry automatically or add a retry for
`RECEIPT_NOT_FOUND`. This addition leaves the existing success and missing-receipt
acceptance meanings unchanged.

## UC-03 source behavior

The signed-in payer opens saved-card management, selects their card, and confirms
removal. Cancel leaves it unchanged. Success removes its token reference and
hides the card from future selection, without changing past payments. A PSP
failure produces `SAVED_CARD_REMOVAL_UNAVAILABLE` and retains the card. Track
`saved_card_removed` on success, mobile channel, for removal monitoring.

## Discovery evidence

Service Blueprint: N/A - this fixture uses the approved product flow above.
Figma: N/A - the product owner confirms reuse of existing selection, receipt,
and card-management screens without a new visual design. Tracking registry:
the event definitions above are the approved snapshot; payloads contain only
correlation IDs, not card/token values or receipt contents.
