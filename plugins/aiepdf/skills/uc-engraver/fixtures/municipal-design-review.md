# Municipal service-status DR/SRS

| ID                              | Value                                       |
| ------------------------------- | ------------------------------------------- |
| `metadata.status`               | draft                                       |
| `metadata.canonical-outcome-id` | MUNICIPAL-STATUS                            |
| `references.prd`                | municipal-evidence.md                       |
| `references.repository`         | https://github.com/example/municipal-status |

## Expected outcome

Residents subscribe by email to one service; operators publish disruption and
recovery updates. The linked product evidence supplies actors and goals.

## Domain model and glossary

- Subscription links a resident's email channel to one Service.
- Service is a municipal service accepting subscriptions.
- ServiceUpdate describes a disruption or a recovery for one Service.
- An unsupported delivery channel is rejected with no Subscription created.

## Components and contracts

| ID                             | Description                           |
| ------------------------------ | ------------------------------------- |
| `solution.components.item-001` | Subscription service                  |
| `solution.components.item-002` | ServiceUpdate publication service     |
| `contracts.item-001`           | Subscription API, POST /subscriptions |
| `contracts.item-002`           | Publication API, POST /updates        |

The subscription API returns a confirmation for email, or the semantic error
`DELIVERY_CHANNEL_UNSUPPORTED` for another channel. Wire status details are
not decided. No product tracking events have been approved yet.

## Use Case index

| ID      | Title                        | Child page                   |
| ------- | ---------------------------- | ---------------------------- |
| `UC-01` | Subscribe to service updates | use-cases/uc-01-subscribe.md |
| `UC-02` | Publish a disruption update  | use-cases/uc-02-publish.md   |

## Open questions

| ID              | Question                                      | Blocking | Owner                      |
| --------------- | --------------------------------------------- | -------- | -------------------------- |
| `open.item-001` | What is the contact-data retention period?    | no       | Municipal Digital Services |
| `open.item-002` | Which product tracking events should be used? | no       | Municipal Digital Services |
