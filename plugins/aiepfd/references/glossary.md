# AIEPFD glossary

Shared domain glossary for skills in the `aiepfd` plugin. Read this file before
interpreting or producing plugin artifacts so terms are used consistently across
skills.

## Terms

- **AIEPFD**: AI-enabled product development. In this plugin, it refers to the
  workflow and artifacts used to move from early product input to structured
  product documents.
- **PRD**: Product Requirements Document. A shared artifact that explains what
  is being built, why it matters, who it serves, and the boundaries of the
  work.
- **Material-first**: A skill entry mode where the user already provides source
  material such as notes, documents, chats, or bullets that must be analyzed
  and synthesized.
- **Interview-first**: A skill entry mode where the source material is missing
  or thin, so the skill must ask targeted questions to build the artifact with
  the user.
- **Clarifying loop**: The repeated ask-analyze-confirm cycle used to resolve
  missing, ambiguous, or contradictory information before or while drafting an
  artifact.
- **Linked artifact**: Any supporting source or downstream document connected to
  the main artifact, such as notes, transcripts, tickets, designs, or related
  specs.
- **Open question**: A point that still needs a decision, confirmation, or
  missing information from the user or stakeholders.
- **Gap**: Information that is expected by the artifact structure but is not yet
  available or reliable enough to state as fact.
- **Metadata frontmatter**: The YAML block at the top of an artifact that stores
  stable, machine-readable fields such as title, owner, status, or release
  target.
- **Stable ID**: A field key or section anchor that must keep the same identity
  across revisions so other agents can locate and update content reliably.
- **Section anchor**: An HTML comment of the form `<!-- id: ... -->` that gives
  a section a stable machine-readable identifier.
- **Draft**: The initial artifact status used when understanding has been
  captured but the document has not yet been reviewed, approved, or advanced to
  a later stage.
