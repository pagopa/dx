# Confluence publication

Use this workflow only after the local DR/SRS Markdown file is complete and
the user explicitly asks to publish it.

1. Ask whether to create or update a Confluence page if the user has not
   already answered.
2. Ask for the target space, parent page, page title, and publication language
   when they cannot be safely inferred.
3. Preserve every stable English section, field, entity, Use Case, and contract
   ID. Translate only human-facing headings, prose, labels, and values when a
   different language is requested.
4. Preserve the complete parent hierarchy, including justified `N/A` values,
   open questions, readiness criteria, and Use Case links.
5. Show the target page title, location, and language before an irreversible
   create/update operation.
6. Use the authenticated Confluence integration when available.
7. Return the created or updated page URL. Publication does not change
   `metadata.status`; lifecycle state changes require a separate explicit
   request.

If no authenticated Confluence integration is available, say so plainly and
return publication-ready content. Do not claim that a page was created.
