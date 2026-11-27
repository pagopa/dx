# Translation rules

Load this file only when a language is requested.

Translate the document, not its identifiers:

- translate human-facing text, headings, table labels, and explanatory prose;
- preserve stable IDs, code, endpoint names, URLs, status enum values, metric
  identifiers, and document references;
- keep hierarchy and field order unchanged;
- for an in-place edit, translate only the text nodes requested and leave every
  other node identical.

Done when every human-facing string is in the requested language and every
preserved identifier is byte-identical to the source.
