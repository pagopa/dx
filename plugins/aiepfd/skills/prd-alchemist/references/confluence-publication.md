# Confluence publication

Use this workflow only after the PRD file is complete and the user explicitly
asks to publish it.

1. Ask which language the Confluence page should use if the user has not already
   specified it.
2. Ask for the target Confluence space and parent page when they cannot be
   inferred safely.
3. Keep every stable ID in English and unchanged.
4. Translate human-facing headings, prose, labels, and table values into the
   chosen language. Preserve every stable English ID and the machine-facing
   status value.
5. Preserve the complete PRD section hierarchy and every metadata and content
   field, including fields marked `Not applicable`.
6. Show or describe the page title, target location, and language before
   creation when the publication tool requires an irreversible action.
7. Create the page with the available authenticated Confluence integration.
8. Return the created page URL. Do not change `metadata.status`; publication
   alone does not advance the PRD lifecycle. The source PRD remains the
   repository of record for stable IDs and status.

If no authenticated Confluence integration is available, state that clearly and
provide the translated, publication-ready content instead of claiming success.
