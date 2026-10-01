Use the dr-blacksmith and uc-engraver skills in the `plugins/aiepdf` dir
to generate a design review with input:

1. the PRD `demo/prd.md`.
2. Technology Radar at https://dx.pagopa.it/radar.json (typescript, azure stack)

- Draft the C4 Mermaid diagrams and attach them inline in the DR.
- Draft for the OpenAPI specifications and attach a `demo/outcome/openapi.yaml` file linked in the DR.

Save DR and UC in the `demo/outcome/` dir.

Derive the backlog items from the DR and UC - without creating them in Jira -
using the jira-magister skill. Save them in a markdown file `demo/outcome/tickets.md`.
