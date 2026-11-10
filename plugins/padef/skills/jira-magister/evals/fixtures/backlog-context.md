# Synthetic backlog context

All records and URLs below are fictional fixtures. Work offline; do not retrieve
these URLs or mutate Jira. Use the supplied records as the document contents
and Jira state. Save the requested draft/diff to `proposal.md` for review.
Project PAY supports Epic, Story, Task, Bug and Sub-task, plus `blocks`.
There are no required custom fields. All work below fits a two-week sprint.
Approved delivery boundaries: only the described receipt flow or enabling
artifact and its relevant tests; exclude new payment behavior, new data models
and deployment. For each flow slice, Output is its described handler/API
integration; Checks exercise that integration's authorization, response or
error-path collaborators, not a copied end-to-end AC. Contract wiring produces
an integrated contract checked by an implementation contract test. Repository
setup produces the TypeScript skeleton checked by a repository review. A spike
produces an owner-confirmed decision record, checked for that confirmation.
Each item uses only the applicable boundary, not the whole backlog scope.

## Documents

- DR-01 - Receipt delivery:
  `https://example.atlassian.net/wiki/spaces/PAY/pages/102`.
  Operational source, complete Always sections, two cohesive outcomes:
  self-service receipt download and assisted receipt recovery.
  `references.repository`: `https://github.com/example/receipts` (main).
  `references.prd`: PRD-01. Catalog: ready UC-01 and ready UC-02.
  Domain: Payment owns a Receipt; a confirmed payment has exactly one receipt.
  `solution.components.item-001`: Receipt API.
  `contracts.item-001`: Receipt API, artifact
  `https://github.com/example/receipts/blob/main/api/openapi.yaml`.
  `NFR-01`: receipts never expose another user's payment.
  `open.item-007`: choose the CAdES verification library for signed receipts;
  Blocking yes, owner Engineering; blocks signature verification only.
  `open.item-003`: optional support dashboard layout; Blocking no, owner Product.
  Other design/security/privacy/accessibility/tracking/support/rollout evidence
  is confirmed N/A for this isolated prototype.
- PRD-01 - Receipts:
  `https://example.atlassian.net/wiki/spaces/PAY/pages/103`.
  Owner Product; outcome: customers retain payment evidence without a support
  ticket. JTBD-01: retain proof of payment; JTBD-02: recover proof with support.
  KPI: 90% successful fixture downloads. Guardrail: no PII in logs.
  `references.related`: unrelated roadmap
  `https://example.atlassian.net/wiki/spaces/PAY/pages/999`; do not cite it.
- UC-01 - Download receipt:
  `https://example.atlassian.net/wiki/spaces/PAY/pages/101`.
  Ready, Must; primary actor exactly "Cittadino pagatore". JTBD-01.
  Trigger: customer selects download for their confirmed payment.
  Main flow: authorize owner, generate PDF, download it.
  Postcondition: PDF contains that payment's evidence.
  AC-01: an owner downloads their confirmed payment's PDF.
  AC-02: another user's receipt request is denied without exposing data.
  Components: solution.components.item-001; contract: contracts.item-001.
  Errors: AGREEMENT_EXTENSION_INVALID for disallowed signed-receipt extension;
  AGREEMENT_SIGNATURE_INVALID for invalid signature, with no receipt stored.
  Figma: `https://www.figma.com/design/abcdefghijklmnopqrstuv/Receipts?node-id=1-2`.
  Blueprint: `https://example.atlassian.net/wiki/spaces/PAY/pages/104`.
- UC-02 - Assisted receipt recovery:
  `https://example.atlassian.net/wiki/spaces/PAY/pages/105`.
  Ready, Must; primary actor exactly "Operatore di assistenza". JTBD-02.
  Trigger: authorized support agent locates a customer's confirmed payment.
  Main flow: verify support access and retrieve the receipt for the customer.
  AC-UC-02-01: authorized support can retrieve the receipt.
  AC-UC-02-02: unauthorized support access is denied.
  Confirmed new retry flow, AC-UC-02-03: a transient retrieval error can be
  retried once by the operator, with no duplicate receipt.
  Components: solution.components.item-001; contract: contracts.item-001.
  Error: AGREEMENT_SIGNATURE_INVALID, exactly the same condition as UC-01.
  Figma and Blueprint: N/A, confirmed internal prototype.
- RFC-08 - Receipt retry:
  `https://example.atlassian.net/wiki/spaces/PAY/pages/106`.
  Accepted and already propagated to DR-01. Stable ID RFC-08.
- ADR-01 - PDF contract:
  `https://example.atlassian.net/wiki/spaces/PAY/pages/107`. Stable ID ADR-01.
- CR-2026-001 - Receipt retry:
  `https://example.atlassian.net/wiki/spaces/PAY/pages/108`. Stable ID CR-2026-001.
- Incident INC-12 - Receipt outage: `https://example.org/incidents/12`.
- Intake IN-01 - Receipt investigation: `https://example.org/intake/1`.

The contract mentions a platform guide at
`https://example.atlassian.net/wiki/spaces/PAY/pages/998`. This is a transitive
reference, not the contract artifact.
Confluence pages publish anchors matching each cited stable ID.

## Existing Jira records

- PAY-10: Epic for assisted recovery, parent of PAY-20.
- PAY-20: Story realizing UC-02. Existing actor/summary:
  "As a Operatore di assistenza, I want to recover a payment receipt, so that
  I can help the customer retain proof of payment."
  Existing coverage: AC-UC-02-01 and AC-UC-02-02 (UC-02). Status In Progress.
  No retry behavior or AC-UC-02-03 yet.
  Source inventory: UC-02 page 105; DR-01 page 102; PRD-01 page 103 with JTBD-02;
  contract artifact api/openapi.yaml with contracts.item-001 under DR.
  Existing native remote link: UC-02 at
  `https://example.atlassian.net/wiki/spaces/PAY/pages/105/Old-title`.
  No other native remote links. Assignee, estimates and unrelated manual note
  "Coordinate with support before rollout" must stay untouched.
- PAY-21: another legitimate slice of UC-02 under PAY-10, for audit export.
  Same UC locator, but unrelated output and coverage. Do not merge it into PAY-20.
- PAY-42: Story under PAY-10, labels payments and receipts, status To Do.
  Actor "Cittadino pagatore"; summary "As a Cittadino pagatore, I want to
  download a payment receipt, so that I can retain proof of payment."
  Existing acceptance ID AC-04: receipt downloads as a PDF.
  Source UC-04 - Download payment receipt,
  `https://example.org/use-cases/download-receipt`.
  No other source documents. New requested payment-history check has no ID yet.
  Acceptance checks are stored in the Jira **description** field. Its exact
  current text is below; this legacy format is intentionally not the new-item
  template:

  ```markdown
  Source: [UC-04 - Download payment receipt](https://example.org/use-cases/download-receipt)

  Acceptance checks:

  - AC-04: receipt downloads as a PDF.
  ```

## Parent Source for the Sub-task test

Copy this block without changes:

## Source

- uc: [UC-01 - Download receipt](https://example.atlassian.net/wiki/spaces/PAY/pages/101)
  - [AGREEMENT_SIGNATURE_INVALID](https://example.atlassian.net/wiki/spaces/PAY/pages/101#AGREEMENT_SIGNATURE_INVALID)
- dr: [DR-01 - Receipt delivery](https://example.atlassian.net/wiki/spaces/PAY/pages/102)
