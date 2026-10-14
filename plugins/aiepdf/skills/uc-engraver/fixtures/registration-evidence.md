# Community registration PRD

- Source: `PRD-community`.
- Audience and exact actor: `Community participant`.
- Outcome: participants register for community events.
- No JTBD ID is defined in this PRD.
- Owner and pilot priority: Community Services / Must.
- Design: https://example.org/design/community-registration.

# Parent DR/SRS — registration-design-review.md

| ID                              | Value                                             |
| ------------------------------- | ------------------------------------------------- |
| `metadata.status`               | draft                                             |
| `metadata.canonical-outcome-id` | COMMUNITY-REGISTRATION                            |
| `references.prd`                | registration-evidence.md                          |
| `references.repository`         | https://github.com/example/community-registration |

Domain: Event has Registrations. A repeated registration is rejected as
`REGISTRATION_ALREADY_EXISTS` without an additional Registration.

| ID                             | Description                                     |
| ------------------------------ | ----------------------------------------------- |
| `solution.components.item-001` | Registration service                            |
| `contracts.item-001`           | Registration API                                |
| `solution.decision.item-006`   | Human-confirmed repeated-registration rejection |

| ID      | Title                 | Child page                  |
| ------- | --------------------- | --------------------------- |
| `UC-01` | Register for an event | use-cases/uc-01-register.md |

| ID              | Question                      | Blocking | Owner              |
| --------------- | ----------------------------- | -------- | ------------------ |
| `open.item-001` | What is the retention period? | no       | Community Services |
