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

Another skill can hand the write step to this one once the content is confirmed.
If no existing page is named, it asks before treating the request as an edit.

## Prerequisites

- The Atlassian MCP server (`mcp.atlassian.com/v2/mcp`) connected with an OAuth
  session carrying the `read/write:confluence:agent-interface` scopes. An
  Atlassian API token (`email:token`) authenticates the Confluence REST API, not
  this server.
- The source document (create), or the target page URL and the change to apply
  (edit).
- For a create: the space, plus the parent page and title.

## What it does

| Path          | Result                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Create**    | One native-HTML create, or a draft multipass for Mermaid attachments. The rendered diagram and unchanged source both reach the page. |
| **Edit**      | One draft baseline, then minimal `data-local-id` edits. The published page changes only when the user publishes the draft.           |
| **Translate** | Human-facing text changes while stable IDs, code, endpoints, URLs, status values, and references stay unchanged.                     |

Before writing it asks for an explicit yes and shows the intended operation.
After writing it reports the page or draft URL. Publication does not change the
document's review or approval state.

## Maintainers

Two Harbor benchmark cases measure this skill on real Confluence pages:
`native-edit-in-place`, which edits a page's draft in place, and
`small-update-large-file`, which measures a small change to a large page. The
benchmark, its OAuth setup, and its troubleshooting live in
[CONTRIBUTING.md](./CONTRIBUTING.md).
