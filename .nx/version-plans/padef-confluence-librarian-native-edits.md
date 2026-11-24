---
padef: minor
---

Rework the `confluence-librarian` skill around Confluence's native HTML edits: edit an existing page in place through granular draft edits on `data-local-id` nodes instead of a Markdown round trip, and render Mermaid diagrams to SVG (via [Pele](https://pele.run/)) while keeping the fence source in a collapsible expand. Defaults to the page's draft and documents the Harbor benchmark that measures the change.

The first benchmark run then corrected the guidance it exposed: a draft reports a page URL (no editor link), Markdown HTML comments are dropped instead of rendered, baseline persistence has a concrete size trigger, `extract-node.js` reads the MCP tool-output envelope, a leading H1 that the page title repeats is dropped even when the title carries a uniqueness suffix, and the create/edit steps carry an operation index and a Mermaid-only branch.

The skill ships self-contained: `plugins/padef` builds `scripts/render-mermaid.mjs` from TypeScript sources with tsdown, inlining Pele, so the renderer runs offline with no `npm install` on first use and no per-user cache directory to warm or guard. `SKILL.md` keeps only the workflow and points at `references/` for the branch-only rules, and the maintainer notes moved to `AGENTS.md` and `harbor/README.md`.
