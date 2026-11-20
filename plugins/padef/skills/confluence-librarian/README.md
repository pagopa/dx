# confluence-librarian

Publishes a prepared document as a Confluence page, or changes an existing page
in place, keeping the structure, macros, and traceability that Confluence cannot
express in Markdown.

## When to use

Ask in plain language, for a new page or for one that already exists:

```text
Publish docs/checkout-prd.md to DevEx under "Product" as "Checkout redesign PRD".
Change the rollout date on <page URL> to 2026-12-01.
Translate the "Payments" page to English.
```

Authoring skills such as `prd-alchemist` and `uc-engraver` hand the write step
to this one once the content is confirmed. If no existing page is named, it asks
before treating the request as an edit.

## Prerequisites

- The Atlassian MCP server (`mcp.atlassian.com/v2/mcp`) connected with an OAuth
  session carrying the `read/write:confluence:agent-interface` scopes. An
  Atlassian API token (`email:token`) authenticates the Confluence REST API, not
  this server.
- The source document (create), or the target page URL and the change to apply
  (edit).
- For a create: the space, plus the parent page and title.

## What it does

- **Create** writes the document once as native HTML. Headings, tables, lists,
  code blocks, and macros survive the conversion; `<details>` becomes a
  collapsible expand, GitHub-style alerts become callouts, front matter becomes
  a metadata table, and a Mermaid fence becomes a rendered diagram
  ([Pele](https://pele.run/)) with the fence kept in an expand below it. It can
  stop at an unpublished draft when you want to review before publishing.
- **Edit** reads the published page as native HTML once, then writes only the
  nodes that change, addressed by their `data-local-id`. The write lands on the
  page's unpublished draft, so the live page changes when you publish it. Ask
  for a working copy to leave the original untouched.
- **Translate** any of the above on request: human-facing text changes, while
  stable IDs, code, endpoints, URLs, status values, and references stay
  unchanged.

## What you see along the way

It asks for an explicit yes and shows the operation summary first — operation,
title, space, parent, language, source, and for an edit the target URL and the
intended difference — then reports the page or draft URL when done. Lifecycle
state stays as you left it: publishing never marks content as reviewed or
approved.

## Maintainers

The Harbor benchmark that measures this skill, its OAuth setup, and its
troubleshooting live in [CONTRIBUTING.md](./CONTRIBUTING.md).
