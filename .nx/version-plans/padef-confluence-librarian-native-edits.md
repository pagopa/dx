---
padef: minor
---

Rework the `confluence-librarian` skill around Confluence's native HTML edits: update an existing page in place through draft edits on `data-local-id` nodes instead of a Markdown round trip, render Mermaid diagrams to SVG while keeping the fence source in a collapsible expand, and default to the page's draft.

The skill now works offline with no install step on first use, and the workflow guidance was corrected against a Harbor benchmark that measures the reworked flow.
