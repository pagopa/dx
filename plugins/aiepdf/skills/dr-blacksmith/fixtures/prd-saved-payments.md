# PRD-saved-payments - Saved-payment experience

Synthetic approved source snapshot for local evaluation. All facts below are
fixture data, not evidence of a live product approval. No remote reads are needed.

## Approved product scope

Owner and approver: Saved Payments product owner. Approved on 2026-09-01.
Outcome ID: SAVED-PAYMENTS. Actor: **Cittadino pagatore**.

- `JTBD-01`: select a previously saved card to avoid entering card details again.
- `KPI-01`: at least 90% of eligible returning payers complete card selection
  without entering card details, measured over the first 30 days of rollout.
- Guardrail: never expose full card numbers or change the existing new-card flow.
- In scope: list the actor's saved cards, select an active card, and retain the
  PSP token reference for the current payment session.
- Out of scope: saving a new card, charging the card, refunds, and managing cards.
- `UC-01`: Select a saved card. Intended child:
  `use-cases/uc-01-select-saved-card.md`; child authoring is separate.

## Engineering source notes

These are confirmed constraints from the synthetic engineering intake, not
additional product decisions.

- Boundary: mobile app -> payment backend -> external PSP token service, over
  authenticated HTTPS. The backend owns the payer's token references; the PSP
  owns token validity. Only the authenticated payer's cards may be returned.
- Domain: a Saved card has a token reference, masked display label, and active
  or expired state; a Payment session belongs to one payer and has zero or one
  selected card. A PSP token is not a card number.
- Technology preferences: Azure CSP, TypeScript backend, existing mobile app;
  OpenAPI for HTTP and AsyncAPI for events. Runtime hosting choice is unresolved.
  Technology Radar assessment has not been supplied: record a gap owned by the
  engineering lead rather than inventing an outcome.

### API and event contract snapshot

Owner: Payments engineering. Version: v1; additive changes only.

- `listSavedCards`: `GET /saved-cards`, returns only masked active cards owned by
  the authenticated payer; invalid authentication returns 401.
- `selectSavedCard`: `PUT /payment-sessions/{id}/saved-card`, accepts a token
  reference; returns 204 when selected, 404 for an inaccessible card/session,
  409 for an expired token, and 503 if PSP validation is unavailable. A failure
  does not change the selected card.
- `saved_card_selected`: internal event with payment session ID and correlation
  ID after successful selection; no card details or token value.

### Security, NFR, and delivery snapshot

Security/privacy owner: Payments security lead. Mask card labels; never log PAN,
CVV, or token values. Token references are encrypted at rest and deleted when
the payer removes the saved card. Security/privacy review is pending and blocks
production launch, not drafting.

- Selection API p95 <= 500 ms at 100 requests/second, excluding mobile network;
  monthly availability target 99.9%. Engineering owns load and failure tests.
- Rollout: feature flag to internal users, then 5%, 25%, 100% of eligible payers
  after a 24-hour observation window at each stage.
- Rollback: disable the flag and retain the existing new-card flow; no destructive
  data migration. Stop rollout if 5xx exceeds 1% for five minutes.
- Monitoring: request rate, latency, 5xx, PSP validation failures, and selection
  completion; alerts route to Payments on-call, with correlation IDs but no tokens.
- Validation: API contract tests, payer-isolation tests, PSP timeout tests, load
  test, and rollback rehearsal are planned; execution evidence remains TBD.
- Repository, hosting topology, accessibility review, support runbook, and launch
  review links are not supplied. Record each as a gap with the engineering lead
  as follow-up owner. Do not invent URLs or claim readiness.
