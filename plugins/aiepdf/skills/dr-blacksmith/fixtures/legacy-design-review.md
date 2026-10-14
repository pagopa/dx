# Community registration DR/SRS

<!-- id: metadata -->

| ID                              | Value                                    |
| ------------------------------- | ---------------------------------------- |
| `metadata.status`               | draft                                    |
| `metadata.canonical-outcome-id` | COMMUNITY-REGISTRATION                   |
| `references.prd`                | source-reconciliation.md                 |
| `references.repository`         | N/A — repository did not exist at intake |
| `references.figma`              | N/A — no design supplied at intake       |

<!-- id: expected-outcome -->

## Expected outcome

A community member registers for an event. The legacy intake proposed
`JTBD-99` and a 95% completion metric, neither approved in the product brief.

<!-- id: solution-design -->

## Solution design

| ID                           | Type       | Statement                      | Owner       |
| ---------------------------- | ---------- | ------------------------------ | ----------- |
| `solution.decision.item-005` | constraint | No repository exists at intake | Engineering |

The original constraint must remain traceable when resolved.

## Domain model and glossary

Event has Registrations. Registration links a participant to one Event.

## Components and contracts

| ID                             | Description                        |
| ------------------------------ | ---------------------------------- |
| `solution.components.item-001` | Registration service               |
| `contracts.item-001`           | Registration API; details proposed |

<!-- id: use-case-index -->

## Use Case index

| ID      | Title                 | Child page                  |
| ------- | --------------------- | --------------------------- |
| `UC-01` | Register for an event | use-cases/uc-01-register.md |

<!-- id: open-questions -->

## Open questions

| ID              | Question                             | Blocking | Owner              |
| --------------- | ------------------------------------ | -------- | ------------------ |
| `open.item-005` | Where will the repository be hosted? | yes      | Engineering        |
| `open.item-012` | Where is the design discovery?       | no       | Community Services |
