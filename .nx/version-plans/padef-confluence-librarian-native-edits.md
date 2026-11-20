---
padef: minor
---

Rework the `confluence-librarian` skill around Confluence's native HTML edits: edit an existing page in place through granular draft edits on `data-local-id` nodes instead of a Markdown round trip, and render Mermaid diagrams to SVG (via [Pele](https://pele.run/)) while keeping the fence source in a collapsible expand. Defaults to the page's draft and documents the Harbor benchmark that measures the change.
