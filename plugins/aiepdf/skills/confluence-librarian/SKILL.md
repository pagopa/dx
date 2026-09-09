---
name: confluence-librarian
description: Publish a prepared document as a new Confluence page, or edit an existing Confluence page in place, preserving structure, macros, and traceability. Use whenever a user asks to create, publish, update, edit, translate, or synchronize Confluence content, including pages handed off by other skills.
---

# Confluence Librarian

Confluence mechanics for documents. You own the mechanics; the calling skill or
user owns the source content and domain rules. When a domain decision is missing
from the source, surface it to the caller rather than invent one to ease
publication.

## Workflow

Both paths share the same three gates, run in order: **confirm** the write with
an explicit yes, **summarize** the irreversible action, and **report the URL**
when done. Each path below ends with its own completion check.

### Decide: create or edit

Choose the path from the target, not the wording of the request:

- an **existing page** must change → **Edit** (section below);
- no target page yet → **Create** (section below).

If the request does not name an existing page, ask before assuming edit. If the
prepared source or the desired change is unavailable, ask for it; report only
content you actually read, published, or edited.

### Confirm and resolve

1. Get an explicit affirmative answer before creating or updating. If the user
   only asked to write a document locally, stop there.
2. Resolve what is not already known: space; parent and title (create); the
   existing page URL and the change to apply (edit); language when relevant.
3. Show the summary before writing:

```text
Operation: create | edit
Title: <page title>
Space: <space>
Parent: <parent or none>
Language: <language>
Source: <document path or artifact>
[Edit] Target: <existing page URL>
[Edit] Change: <the intended difference>
```

### Create — publish a prepared document once

1. **Validate the source.** Preserve headings, tables, lists, and code blocks
   across conversion, and apply the Structure and traceability rules below. When
   the source is Markdown and starts with an H1 matching the page title, drop
   that H1 from the body so the title is not shown twice.
2. **Convert once to native HTML.** Build Confluence's native HTML body and map
   Markdown-only rich constructs to their Confluence equivalents:
   `<details>`/`<summary>` → collapsible expand; `> [!NOTE]`, `> [!TIP]`,
   `> [!WARNING]`, `> [!CAUTION]` → info/tip/warning/error callouts. Front
   matter is not native metadata: render it as a metadata table. Publish with
   `createConfluenceContent` (`body.format: html`), or as an unpublished draft
   (`draft: true`) when the user wants to edit before publishing.
3. **Translate if requested.** Apply the Translation rules below.
4. **Write.** Show the summary, then create the page.
5. **Done when** the page exists at the returned URL and its body carries the
   source's structure, stable IDs, and status values.

### Edit — change an existing page in place

Apply the **native edit protocol** below; this section is its step order.

An in-place edit runs on the page's unpublished **draft**: the published page
stays untouched until the user publishes. A page with no draft yet gets one from
the first `draft: true` write below — the write creates it from the published
body, and that write's response `webUrl` is the draft's resume URL
(`…/pages/resumedraft.action?draftId=…`).

1. **Fetch the baseline and the draft.** Fetch the published page **as native
   HTML** — `getConfluenceContent` with `content_format: html`, `detail: full`
   — for its current body and `snapshotToken`. Fetch the draft too (`draft:
   true`, `content_format: html`) to see what has already been staged.
2. **Apply the minimal change.** Express it as granular edits on the node's
   `data-local-id` (protocol rule 2) and keep every element you are not
   changing byte-for-byte (protocol rule 3).
3. **Persist directly, on the draft.** Write through `updateConfluenceContent`
   with `draft: true`, passing the **published** page's current `snapshotToken`
   — the write validates against that token, not the draft's. The write itself
   validates and rejects an invalid document; a server dry-run is not required.
   Use `dryRun` only when you want the canonical resulting HTML without a full
   re-fetch (to confirm macros survived or to refresh the baseline).
4. **Done when** the intended change is staged on the draft, unrelated content —
   including macros and expandables — survived, and you report the draft's
   resume URL. The change reaches the published page only when the user
   publishes the draft.

### Preserve lifecycle state

Both paths leave a document's status (`metadata.status`, `draft`/`current`,
review state) unchanged. Change lifecycle state only when the user explicitly
requests it and the domain skill permits it.

## Native edit protocol

An existing Confluence page holds content that has **no Markdown form** —
`toc`, collapsible `expand`/`<details>`, info/note/tip/warning/error panels,
images, smart links, inline comments, `data-local-id` anchors. Converting the
page to Markdown and back silently destroys them, so edit the page's own native
HTML. The rules:

1. **Work from a known-good baseline.** Start from the baseline the Baseline
   contract defines; every change is a diff against it.
2. **Send only the change.** Express changes as granular edits on a node's
   `data-local-id` — e.g. `replaceNode`, `insertNodeAfter`/`insertNodeBefore`,
   `deleteNode`. On the Atlassian MCP, pass them to `updateConfluenceContent` as
   an `edits` array. A full `body` is only for changes a node-level edit cannot
   express, and is still the baseline with the smallest possible diff.
3. **Keep what you are not changing.** Preserve every native-only construct you
   were not asked to change, keeping the `data-local-id` attributes on nodes you
   keep — granular edits address nodes by those anchors.

## Baseline contract

The **baseline** is the page's current native HTML together with its
`snapshotToken` and version — the reference for verifying that an edit changed
only what was requested.

- **In context by default.** Hold the baseline in context for the task. Do not
  re-fetch the full page before every edit; fetch only when a new baseline is
  needed.
- **Persist to a file only when it pays.** For a large page edited repeatedly,
  or work that resumes in another session, save it and read it back as the
  starting baseline on resume:

  ```text
  <working-dir>/confluence/<content-id>.html      # full native HTML body
  <working-dir>/confluence/<content-id>.json      # { contentId, title, spaceId,
                                                   #   snapshotToken, version }
  ```

- **A new baseline is produced** by a fresh fetch, or when the integration
  returns canonical output (a dry-run result or the persisted page) with a new
  snapshot token. Never rebuild it from memory.
- **Staleness.** If an update returns `snapshot_stale`, discard the cached
  token, refetch once, and re-apply the intended change.
- Never store credentials in baseline files.

## Structure and traceability rules

- Preserve every stable ID exactly; IDs are never translated or renumbered.
- Preserve every section, including conditional sections marked `N/A — <reason>`.
- Preserve links to PRDs, RFCs, ADRs, Figma, Service Blueprints, APIs, events,
  data contracts, reviews, dashboards, and Jira.
- Preserve visible status values; do not infer approval from publication.
- Keep detailed content in the page; replace it with a summary only when the
  user explicitly asks.
- Verify edits by content, not byte equality: Confluence re-normalizes HTML
  cosmetics on import/export, but macros and node structure must survive
  identically.

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
- **`snapshot_stale`:** the baseline is outdated — recover as the Baseline
  contract describes.
- **Edit target cannot be resolved:** ask, do not create a duplicate page as a
  fallback.
