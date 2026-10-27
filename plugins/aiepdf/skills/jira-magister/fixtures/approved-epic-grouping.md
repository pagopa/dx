# Approved Epic grouping and offline Jira context

Synthetic planning snapshot. The product owner approved these boundaries on
2026-09-15; approval covers grouping only, not Jira writes.

| Epic draft reference  | Outcome                    | Source                             | Boundary                                            |
| --------------------- | -------------------------- | ---------------------------------- | --------------------------------------------------- |
| EPIC-SAVED-CARDS      | Reuse a saved card         | DR-01, PRD-payments/JTBD-01, UC-01 | Two sprints; exclude charging and card registration |
| EPIC-SUPPORT-RECEIPTS | Find a receipt for support | DR-01, PRD-payments/JTBD-02, UC-02 | Two sprints; exclude refunds and delivery channels  |

Sources: [DR-01](design-review-payments.md), [PRD-payments](prd-payments.md),
[UC-01](uc-01-select-saved-card.md), [UC-02](uc-02-find-payment-receipt.md).
Use the linked KPI/guardrail for each outcome. Repository setup and API wiring
are confirmed enabling work in DR delivery evidence, not actor Stories.

Target context snapshot: project PAY, board PAY Planning, types Epic/Story/Task,
Epic parent field supported, labels `payments`, no additional required fields.
Draft references above are not existing Jira issue keys; no projection exists.
Prepare the proposal locally, flag any unresolved mapping, and request explicit
confirmation before future persistence. No Jira calls are authorized.
