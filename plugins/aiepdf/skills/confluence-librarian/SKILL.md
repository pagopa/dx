---
name: confluence-librarian
description: Publish and update prepared pages and document artifacts in Confluence without losing structure or traceability. Use whenever a user asks to publish, create, update, translate, or synchronize Markdown, HTML, or another readable document to Confluence, including hierarchical child pages under a parent catalog. Require explicit confirmation before irreversible publication and preserve headings, tables, links, statuses, IDs, and intentional gaps.
---

# Confluence Librarian

Move a prepared page or document into Confluence while preserving its meaning,
structure, traceability, and lifecycle state. This skill owns publication
mechanics; the calling skill or user owns the source content and domain rules.

## When to use this skill

Use this skill when:

- a user asks to publish or update a prepared page or document in Confluence;
- another skill has completed any artifact, such as a PRD, DR/SRS, RFC, runbook,
  meeting note, guide, decision record, or operational page, and the user
  confirms publication;
- a user asks to translate or synchronize an existing document into a
  Confluence page;

Do not invent missing domain decisions. Do not rewrite the source content's
meaning merely to make publication easier.

## Input contract

Accept the following from the calling skill or user:

| Input            | Required    | Description                                             |
| ---------------- | ----------- | ------------------------------------------------------- |
| Source document  | Yes         | Path or content of the prepared page/document artifact  |
| Operation        | Yes         | Create a new page or update an existing page            |
| Title            | Yes         | Page title, inferred only when unambiguous              |
| Language         | Yes         | Visible page language; preserve machine-facing IDs      |
| Space            | Yes         | Target Confluence space, inferred only when safe        |
| Parent page      | When needed | Parent page for hierarchical content such as a Use Case |
| Existing page ID | For updates | Page ID or URL when updating an existing page           |

If the source document is not available, ask the user to provide it. Do not
claim to have published content that was not read.

## Workflow

1. **Confirm publication.** Before creating or updating a page, obtain an
   explicit affirmative answer. If the user only asks to write a document,
   stop after the local artifact and do not start publication questions.
2. **Resolve destination.** Ask for the target space, parent page when the
   document belongs in an existing page hierarchy, title, language, and
   operation when they cannot be inferred safely. For updates, resolve the
   existing page ID and fetch the current page before replacing it.
3. **Read and validate the source.** Preserve the complete heading hierarchy,
   tables, lists, links, code blocks, stable HTML-comment IDs, table IDs,
   statuses, `N/A` reasons, open questions, and source references. Identify
   unsupported constructs before writing. Treat markdown soft-wraps as
   presentation-only formatting, never as content (collapse them in step 4).
4. **Prepare the representation.** Convert the source into the format
   supported by the authenticated Confluence integration. For a Markdown
   source, run the bundled normalizer so soft-wraps become deterministic
   output: `python3 scripts/prepare_markdown.py --title "<page title>" <source>.md <prepared>.md`.
   Resolve `scripts/` relative to this SKILL.md's own directory (the path
   reported when this skill was loaded), never relative to your working
   directory. Skip the script for HTML sources or already-normalized Markdown.
   What the script keeps verbatim, and how to publish constructs such as
   `<details>` and admonitions, is the rich-content rule under Structure rules.
   When a language is requested, translate per the Translation rules.
5. **Show the irreversible action.** State the operation, page title, space,
   parent, language, and source path before creating or updating the page.
6. **Publish through the authenticated integration.** Use the available
   Confluence tool or API. For updates, preserve the current page's relevant
   metadata, replace only the requested content, and pass the `snapshotToken`.
7. **Verify the result.** Retrieve or inspect the returned page identifier and
   URL. Compare the stored body by content parity (see Structure rules), not
   by byte equality, since Confluence normalizes Markdown cosmetics on import
   and export. Confirm that the operation succeeded and report the page URL.
   If the integration reports an error, surface it rather than returning a
   success-shaped response.
8. **Preserve lifecycle state.** Publication alone must not change a source
   document's status such as `draft` or `review`. Change lifecycle state only
   when the user explicitly requests it and the domain skill permits it.

## Confirmation protocol

Use this question when a prepared document is ready but publication has not
been confirmed:

> Do you want me to create or update the Confluence page for this document?

After an affirmative answer, ask only for destination details that are not
already known. Do not ask for language, space, or parent before publication
confirmation unless the user explicitly asks to plan the publication.

Before the write, summarize:

```text
Operation: create/update
Title: <page title>
Space: <space>
Parent: <parent or none>
Language: <language>
Source: <document path or artifact>
```

## Structure and traceability rules

- Preserve every stable ID exactly. IDs are never translated or renumbered.
- Preserve every source section, including conditional sections marked
  `N/A — <reason>`.
- Preserve links to PRDs, RFCs, ADRs, Figma, Service Blueprints, APIs, events,
  data contracts, reviews, dashboards, and Jira.
- Preserve visible status values and do not infer approval from publication.
- Keep detailed source content in the page; do not replace it with a summary
  unless the user explicitly requests a summary.
- Treat the Confluence page title as separate from the body. When the source
  starts with a Markdown H1 whose text exactly matches the page title, omit
  that H1 from the published body to avoid displaying the title twice. Keep
  later H1 headings and a leading H1 with different text unchanged.
- Use the authenticated integration's native document representation when
  available. Never store credentials in the skill or generated document.
- For updates, fetch the existing page first when the operation could overwrite
  comments, local IDs, links, or page metadata. Fetching also returns the
  `snapshotToken` that updates require; pass it with the update.
- Confluence-only rich content has no plain-Markdown body form. Examples:
  collapsible sections (`expand` / `<details>` "a comparsa"), callouts
  (`info`, `note`, `tip`, `warning`, `error`, panels), `toc`, images, smart
  links, inline comments. A full-body Markdown replace cannot carry them, so
  **never delete or flatten them to make a Markdown push pass** — that is
  content loss. Instead, when such constructs must survive:
  - if the incoming source already states them (a `<details>`/`<summary>` block,
    or an admonition like `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`,
    `> [!CAUTION]`), publish them as their Confluence macro equivalents
    (collapsible `expand`; `info`/`tip`/`warning`/`error` callout) through a
    route that supports macros — HTML body or granular `edits` — and verify
    they survived, rather than pushing a body that would flatten them;
  - if the existing page has such constructs and the incoming source does not
    restate them, carry them forward or stop and ask the user — never silently
    drop them, and never create a placeholder page or duplicate as a fallback.
- Ignore markdown soft-wraps in the source; the bundled normalizer (in this
  skill's `scripts/` directory) turns wrapped lines into one logical line per
  paragraph/item so they do not become new paragraphs, bullets, or hard breaks
  in Confluence. It deliberately keeps code fences, `<details>` blocks, HTML
  comments, and admonition bodies (label and wrapped prose) verbatim; how to
  publish constructs the script keeps verbatim is the rich-content rule above.
- Verify by **content parity, not byte parity**: Confluence's own Markdown
  round-trip re-normalizes cosmetics (table separators to `| --- |`, emphasis
  delimiters, escaping, blockquote markers). Compare token streams ignoring
  whitespace and structural `>` markers, or run the script's built-in
  `--check`. `--check` detects lost or reordered tokens only; it does not
  prove Markdown structure survived, so also confirm that tables, list-item
  indentation, and blockquote nesting are intact in the prepared body.
  Cosmetic deltas are expected and not a sync failure.
- Markdown front matter is not native Confluence metadata. When publishing a
  Markdown document, render its front-matter values as a Confluence metadata
  table, and verify that stable IDs and lifecycle status remain visible after
  conversion.

## Translation rules

When a language is requested:

- translate human-facing text, headings, table labels, and explanatory prose;
- preserve stable English IDs, code, endpoint names, URLs, status enum values,
  metric identifiers, and document references;
- keep the hierarchy and field order unchanged;
- do not translate content that the source marks as machine-facing.

## Failure handling

- If authentication or permissions are unavailable, report the concrete
  failure and return publication-ready content instead of claiming success.
- If the destination is ambiguous, ask for the missing destination detail.
- If the source cannot be parsed or contains unsupported structure, identify the
  affected section and ask how to proceed; do not silently flatten it.
- If an update target cannot be resolved, do not create a duplicate page as a
  fallback.
