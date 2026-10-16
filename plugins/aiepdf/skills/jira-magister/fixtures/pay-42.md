# PAY-42 - Current Story snapshot

Synthetic offline Jira state. Project: PAY. Type: Story. Parent: PAY-10 - Payment
receipts. Status: In Progress. Assignee: Receipt implementation owner.
Priority: Medium. Estimate: 3 story points. Labels: payments, receipts.
No additional required fields in the supplied project metadata snapshot.

Summary: As a Cittadino pagatore, I want to download the payment receipt, so that
I can keep proof of payment.

## Current description

Actor: Cittadino pagatore. An authenticated payer downloads the receipt PDF
from the completed payment details page. Scope fits one two-week sprint.
Support note: preserve the existing receipt-help link.

- `AC-04`: From an owned completed payment's details page, downloading its
  available receipt returns a PDF.
- `AC-05`: A payer cannot download another payer's receipt.

Source: UC-04 | AC-04 | AC-05

Remote source link: UC-04 - Download payment receipt,
https://example.org/use-cases/download-receipt.
Parent URL snapshot: https://example.org/jira/PAY-10.

## Requested addition, not yet applied

The product owner confirmed that the same receipt PDF must also be downloadable
from the owned payment's history-page entry. Add a new acceptance ID for this
route without changing AC-04 or AC-05. Product behavior approval is not Jira
write approval. Propose the description/source-line diff locally and wait.
After future explicit write confirmation, re-read current state, apply only
the confirmed diff, then re-fetch PAY-42 and verify fields, IDs, and source links.
No update or post-write verification has happened in this scenario.
