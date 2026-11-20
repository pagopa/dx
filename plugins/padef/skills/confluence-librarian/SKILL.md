---
name: confluence-librarian
description: Publish a prepared document as a new Confluence page, or edit an existing Confluence page in place, preserving structure, macros, and traceability. Use whenever a user asks to create, publish, update, edit, translate, or synchronize Confluence content, including pages handed off by other skills.
---

# Confluence Librarian

Confluence mechanics for documents. You own the mechanics; the calling skill or
user owns the source content and domain rules. When a domain decision is missing
from the source, surface it to the caller rather than invent one to ease
publication.

## When to use

Load this skill when the user wants a document in Confluence — a new page or a
change to an existing one, in any language. Typical requests:

```text
Publish docs/checkout-prd.md to DevEx under "Product" as "Checkout redesign PRD".
Change the rollout date on <page URL> to 2026-12-01.
Translate the "Payments" page to English.
```

A calling skill may hand the write step to this one once the content is
confirmed.

## Prerequisites

- The Atlassian MCP server (`mcp.atlassian.com/v2/mcp`) connected with an OAuth
  session carrying the `read/write:confluence:agent-interface` scopes. An
  Atlassian API token (`email:token`) authenticates the Confluence REST API, not
  this server.
- The source document (create), or the target page URL and the change to apply
  (edit).
- For a create: the space, plus the parent page and title.

## Workflow

Both paths follow this pipeline:

**confirm → resolve → summarize → write → report the URL**.

Both paths follow the server's authoring rules: load `getContentFormatGuide`
once for the write's `toolName` (`createConfluencePage` / `updateConfluencePage`)
before choosing a `body.format` or authoring an edit, and `getConfluenceSpace`
when the content you read reports space instructions.

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
   the source is Markdown and starts with an H1 matching the page title, drop
   that H1 from the body so the title is not shown twice.
2. **Convert once to native HTML.** Build Confluence's native HTML body and map
   Markdown-only rich constructs to their Confluence equivalents:
   `<details>`/`<summary>` → collapsible expand; `> [!NOTE]`, `> [!TIP]`,
   `> [!WARNING]`, `> [!CAUTION]` → info/tip/warning/error callouts; a Mermaid
   fence → a rendered diagram with its source retained. Front matter is not
   native metadata: render it as a metadata table.
3. **Translate if requested.** Apply the Translation rules below.
4. **Write.** Use one `createConfluenceContent` call with
   `body.format: html`. A Mermaid fence takes the multipass branch documented in
   [references/mermaid.md](./references/mermaid.md).
5. **Done when** the write response returns the requested page or draft URL,
   and the response content preserves the source's structure, stable IDs, and
   status values. For Mermaid, also verify that every fence has both its media
   node and unchanged source expand.

### Edit — change an existing page in place

Read [references/edit.md](./references/edit.md) before the first write. It owns
the copy, bootstrap, edit, and baseline branches.

1. **Fetch the draft baseline once** as native HTML.
2. **Bootstrap a draft** only when the read returns published content with no
   token; use the response as the draft baseline.
3. **Apply the minimal change** as `data-local-id` edits; leave every other node
   intact.
4. **Persist on the draft** with the baseline's `snapshotToken`.
5. **Done when** the write response verifies the requested change and returns
   the draft's resume URL; the published page remains unchanged until the user
   publishes that draft.

## Structure and traceability rules

- Preserve every stable ID exactly; IDs are never translated or renumbered.
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

## Translation rules

When a language is requested:

- translate human-facing text, headings, table labels, and explanatory prose;
- preserve stable IDs, code, endpoint names, URLs, status enum values, metric
  identifiers, and document references;
- keep hierarchy and field order unchanged;
- for an in-place edit, translate only the text nodes requested and leave every
  other node identical.

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
