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
   **Order matters when the target copy does not exist yet** (for example
   "create a fresh working copy of the seed page, then publish or update that
   copy"): create the copy first and resolve its exact title, then prepare the
   body against that copy — run the normalizer with `--title` set to the copy's
   title (never the seed's), because the leading-H1 rule compares to the page
   you will actually write. Do not prepare the body before the copy exists.
5. **Show the irreversible action.** State the operation, page title, space,
   parent, language, and source path before creating or updating the page.
6. **Publish through the authenticated integration.** Use the available
   Confluence tool or API. For updates, preserve the current page's relevant
   metadata, replace only the requested content, and pass the `snapshotToken`.
   Publish the prepared representation from step 4 — pass that body, do not
   re-type or hand-author the document as new HTML. Use a macro-capable route
   only for constructs a Markdown body cannot carry (see the rich-content
   rule), and keep the prepared content as the source of truth for those too.
7. **Verify the result.** Retrieve the returned page identifier and URL and
   save the stored body (Markdown representation) to a local file in one
   fetch — do not re-read or inline the whole document into the conversation.
   Then run this skill's deterministic parity check:
   `python3 scripts/verify_confluence_parity.py <prepared>.md <stored>.md`.
   It compares token streams ignoring whitespace, structural `>` markers,
   HTML/XML tags, and stable comment markers that Confluence dropped outright,
   treats cosmetic Markdown re-normalization as non-fatal, and fails only on
   real content deltas or comment markers an import **escaped into visible
   text** (`\<!--`/`&lt;!--`). Re-read **only** the regions the report flags
   (or target them with a grep for stable IDs / `N/A` / macro nodes), fix
   anything genuinely mangled through a comment-/macro-preserving route, and
   re-run the check. Confluence does not support HTML comments on every write
   route: when a stable `<!-- id: … -->` is dropped rather than mangled, that
   is a platform limitation — keep the marker in the prepared representation,
   note it, and do not loop trying to restore it. If the stored body came back
   as HTML, re-save the Markdown export so the comparison stays meaningful.
   Cosmetic deltas are expected, not a failure. Confirm that the operation
   succeeded and report the page URL. If the integration reports an error,
   surface it rather than returning a success-shaped response.
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
- Stable `<!-- id: … -->` markers must stay **comments** in Confluence, not
  visible or escaped text. A Markdown import can escape them (`\<!--`,
  `&lt;!--`) or render them as a paragraph; after writing, fetch the stored
  body and, whenever a marker was mangled into visible text, restore it once
  through a representation that preserves HTML comments (storage body or
  granular edit), then re-verify. Some Confluence write routes cannot retain
  HTML comments at all: if the marker comes back **absent** (not mangled), keep
  it in the prepared representation and accept the drop as a platform
  limitation — never loop or fake success on it.
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
  delimiters, escaping, blockquote markers). Prefer the bundled deterministic
  check `scripts/verify_confluence_parity.py <prepared>.md <stored>.md` over
  reading the stored body yourself: save the fetched body to a file and let the
  script compare token streams ignoring whitespace, structural `>` markers,
  HTML/XML tags, and stable comment markers Confluence dropped outright, report
  `PARITY_OK`/`PARITY_COSMETIC`/`PARITY_DIFF`, and print
  only the first mismatched windows. The check is deliberately blind to
  structure (it strips tags and whitespace), so it **cannot flag pure
  structural loss**: flattening a `<details>`/expand macro, an
  `info`/`note`/`tip`/`warning`/`error` callout, a `toc`, an image, or a smart
  link into plain prose can still print `PARITY_OK`. Whenever the source or the
  existing page contains such constructs, run an independent structural check
  on top of parity — do not rely on the flagged regions alone, because a
  flattened construct leaves nothing to flag. Confirm each construct survived
  as a macro node in the stored body (for example count the `<details>`/expand,
  callout, `toc`, or image nodes against the prepared body or the source) and
  treat a surviving-but-flattened construct as content loss even when parity
  reports `PARITY_OK`. Inspect other structure (tables, list-item indentation,
  blockquote nesting) in the regions the report flags. The normalizer's own
  `--check` detects lost or reordered tokens on the *prepared* file only and
  cannot compare against the stored page. Cosmetic deltas are expected and are
  not a sync failure.
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
