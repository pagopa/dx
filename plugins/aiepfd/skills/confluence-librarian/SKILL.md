---
name: confluence-librarian
description: Publish and update prepared pages and document artifacts in Confluence without losing structure or traceability. Use whenever a user asks to publish, create, update, translate, or synchronize Markdown, HTML, or another readable document to Confluence, whether it is a PRD, DR/SRS, RFC, runbook, meeting note, guide, decision, or any other page. Require explicit confirmation before irreversible publication and preserve headings, tables, links, statuses, IDs, and intentional gaps.
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
- a Confluence page must be updated without losing stable IDs, links, open
  questions, or status values.

Do not invent missing domain decisions. Do not rewrite the source content's
meaning merely to make publication easier.

## Input contract

Accept the following from the calling skill or user:

| Input            | Required    | Description                                                      |
| ---------------- | ----------- | ---------------------------------------------------------------- |
| Source document  | Yes         | Path or content of the prepared page/document artifact           |
| Operation        | Yes         | Create a new page or update an existing page                     |
| Title            | Yes         | Page title, inferred only when unambiguous                       |
| Language         | Yes         | Visible page language; preserve machine-facing IDs               |
| Space and parent | Yes         | Target Confluence space and parent page, inferred only when safe |
| Existing page ID | For updates | Page ID or URL when updating an existing page                    |

If the source document is not available, ask the user to provide it. Do not
claim to have published content that was not read.

## Workflow

1. **Confirm publication.** Before creating or updating a page, obtain an
   explicit affirmative answer. If the user only asks to write a document,
   stop after the local artifact and do not start publication questions.
2. **Resolve destination.** Ask for the target space, parent page, title,
   language, and operation when they cannot be inferred safely. For updates,
   resolve the existing page ID and fetch the current page before replacing it.
3. **Read and validate the source.** Preserve the complete heading hierarchy,
   tables, lists, links, code blocks, stable HTML-comment IDs, table IDs,
   statuses, `N/A` reasons, open questions, and source references. Identify
   unsupported constructs before writing.
4. **Prepare the representation.** Convert the source into the format
   supported by the authenticated Confluence integration. Translate only
   human-facing prose, headings, labels, and values when requested. Keep
   stable IDs, machine-facing status values, entity IDs, URLs, API operation
   names, and code unchanged.
5. **Show the irreversible action.** State the operation, page title, space,
   parent, language, and source path before creating or updating the page.
6. **Publish through the authenticated integration.** Use the available
   Confluence tool or API. For updates, preserve the current page's relevant
   metadata and replace only the requested content.
7. **Verify the result.** Retrieve or inspect the returned page identifier and
   URL. Confirm that the operation succeeded and report the page URL. If the
   integration reports an error, surface it rather than returning a
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
- For updates, fetch the existing page first when the operation could overwrite
  comments, local IDs, links, or page metadata.
- Use the authenticated integration's native document representation when
  available. Never store credentials in the skill or generated document.

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
