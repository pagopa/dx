---
name: confluence-librarian
description: Publish a prepared document as a new Confluence page, or edit an existing Confluence page in place, preserving structure, macros, and traceability. Use whenever a user asks to create, publish, update, edit, translate, or synchronize Confluence content, including pages handed off by other skills.
---

# Confluence Librarian

Confluence mechanics for documents. You own the mechanics; the calling skill or
user owns the source content and domain rules. When a domain decision is missing
from the source, surface it to the caller rather than invent one to ease
publication.

## Prerequisites

- The Atlassian MCP server (`mcp.atlassian.com/v2/mcp`) connected with an OAuth
  session carrying the `read/write:confluence:agent-interface` scopes. An
  Atlassian API token (`email:token`) authenticates the Confluence REST API, not
  this server.
- The source document (create), or the target page URL and the change to apply
  (edit).
- For a create: the space, plus the parent page and title.

## Files

| File                                                     | Read it when                     |
| -------------------------------------------------------- | -------------------------------- |
| [references/edit.md](./references/edit.md)               | the target is an existing page   |
| [references/mermaid.md](./references/mermaid.md)         | the source holds a Mermaid fence |
| [references/translation.md](./references/translation.md) | a language is requested          |

`scripts/` holds the helpers those files call: `extract-node.js` (offline node
extractor) and `render-mermaid.mjs` (Mermaid fence to SVG).

## Workflow

Both paths follow this pipeline:

**confirm → resolve → summarize → write → report the URL**.

Both paths follow the server's authoring rules: load `getContentFormatGuide`
once for the write's `toolName` (`createConfluencePage` / `updateConfluencePage`)
before choosing a `body.format` or authoring an edit, and `getConfluenceSpace`
when the content you read reports space instructions.

### Operations

| Need                   | Operation                                                     |
| ---------------------- | ------------------------------------------------------------- |
| read a page or draft   | `getConfluenceContent` (`detail: "full"`, `draft: true`)      |
| create a page          | `createConfluenceContent` (`body.format: "html"`)             |
| change a page or draft | `updateConfluenceContent` (`snapshotToken`, `edits`, `draft`) |
| copy a page            | `copyConfluenceContent` (through `executeWrite`)              |

### Decide: create or edit

Choose the path from the target, not the wording of the request:

- an **existing page** must change → **Edit** (section below);
- otherwise, resolve the destination and prepared source → **Create** (section
  below).

Ask for a missing destination or change. Report only content you actually read,
published, or edited.

### Confirm, resolve, and summarize

1. Get an explicit affirmative answer before creating or updating. If the user
   only asked to write a document locally, stop there.
2. Resolve what is not already known: space; parent and title (create); the
   existing page URL and the change to apply (edit); language when relevant.
3. Show the summary before writing:

```text
Operation: create | edit
Title: <page title>
Space: <space>
Parent: <parent>                       [create only]
Language: <language>
Source: <document path or artifact>    [create only]
Target: <existing page URL>            [edit only]
Change: <the intended difference>      [edit only]
```

### Create — publish a prepared document once

1. **Validate the source.** Preserve headings, tables, lists, and code blocks
   across conversion, and apply the Structure and traceability rules below. When
   the source is Markdown and starts with an H1 that the page title repeats,
   drop that H1 from the body so the title is not shown twice. A uniqueness
   suffix on the title (a date, a counter) does not make the H1 its own
   heading: drop it too.
2. **Convert once to native HTML.** Build Confluence's native HTML body and map
   Markdown-only rich constructs to their Confluence equivalents:
   `<details>`/`<summary>` → collapsible expand; `> [!NOTE]`, `> [!TIP]`,
   `> [!WARNING]`, `> [!CAUTION]` → info/tip/warning/error callouts; a Mermaid
   fence → a rendered diagram with its source retained. YAML or TOML front
   matter is not native metadata: render it as a metadata table. A Markdown HTML
   comment has no native form: drop it, and never give its value a row, a label,
   or a sentence.
3. **Translate if requested.** Follow
   [references/translation.md](./references/translation.md).
4. **Write.** One `createConfluenceContent` call with `body.format: "html"`.
   Only when the source holds a Mermaid fence, follow the multipass branch in
   [references/mermaid.md](./references/mermaid.md).
5. **Done when** the write response returns `id`, `status`, `webUrl`, and
   `baseUrl`, and the response content preserves the source's structure, stable
   IDs, and status values. Report the page as `baseUrl` + `webUrl`. For Mermaid,
   also verify that every fence has both its media node and unchanged source
   expand.

### Edit — change an existing page in place

Full protocol: [references/edit.md](./references/edit.md).

1. **Fetch the draft baseline once** as native HTML.
2. **Bootstrap a draft** only when the read returns published content with no
   token; use the response as the draft baseline.
3. **Apply the minimal change** as `data-local-id` edits; leave every other node
   intact.
4. **Persist on the draft** with the baseline's `snapshotToken`.
5. **Done when** the write response verifies the requested change with
   `status: "draft"`, and you report the draft as `baseUrl` + `webUrl` labeled
   unpublished; the published page remains unchanged until someone publishes
   that draft.

## Structure and traceability rules

- Preserve every stable ID exactly in the element that already carries it; IDs
  are never translated, renumbered, or promoted into visible content.
- Preserve every section, including conditional sections marked `N/A — <reason>`.
- Preserve links to PRDs, RFCs, ADRs, Figma, Service Blueprints, APIs, events,
  data contracts, reviews, dashboards, and Jira.
- Preserve visible status values; do not infer approval from publication.
- Leave the document's lifecycle state (`metadata.status`, `draft`/`current`,
  review state) unchanged; change it only when the user explicitly asks.
- Keep detailed content in the page; replace it with a summary only when the
  user explicitly asks.
- Verify edits by content, not byte equality: Confluence re-normalizes HTML
  cosmetics on import/export, but macros and node structure must survive
  identically.
- Ignore Markdown soft-wraps in the source: wrapped lines are formatting only,
  so they must not become new paragraphs, bullets, or hard breaks.

## Failure handling

- **Authentication or permissions unavailable:** report the concrete failure and
  return publication-ready content instead of claiming success.
- **Ambiguous destination or target:** ask for the missing detail.
- **Source cannot be parsed or has unsupported structure:** identify the
  affected section and ask how to proceed; do not silently flatten it.
- **The write rejects the body:** surface the validation result and fix the
  document; do not bypass validation or fall back to a lossy form.
- **`snapshot_stale`:** the baseline is outdated — follow the staleness rule
  in [references/edit.md](./references/edit.md).
- **Edit target cannot be resolved:** ask, do not create a duplicate page as a
  fallback.
