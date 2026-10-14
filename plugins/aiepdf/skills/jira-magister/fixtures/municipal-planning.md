# Municipal service-status planning sources

Synthetic approved sources for an offline Jira draft. Jira project: SERV.
Epic grouping is approved: subscription delivery and publication delivery.
No Jira mutation has been confirmed.

## PRD

- ID `PRD-municipal`, owner Municipal Digital Services.
- Actors `Resident subscriber`, `Service operator`.
- `JTBD-01`: timely awareness of service disruption.
- KPI: 90% of updates delivered within two minutes.
- Guardrail: no contact data in operational logs.
- Source URL: https://example.org/prd/municipal.
- Design: https://example.org/design/municipal.

## DR/SRS

- Source ID `DR-municipal`, status draft, canonical outcome MUNICIPAL-STATUS.
- Canonical URL: https://example.org/design-review/municipal.
- `references.repository`: https://github.com/example/municipal-status.
- Domain entities: Subscription, Service, ServiceUpdate.
- `solution.components.item-001`: subscription service.
- `solution.components.item-002`: publication service.
- `contracts.item-001`: subscription API.
- `contracts.item-002`: publication API.
- Deployment, privacy and launch-readiness reviews are owned by Municipal
  Digital Services; they block production launch, not this offline preview.

## UC-01 — Subscribe to service updates

Status ready, priority Must, actor `Resident subscriber`, JTBD-01.
Components/contract: solution.components.item-001, contracts.item-001.
Canonical URL: https://example.org/use-cases/UC-01.

Trigger: a resident submits an email subscription for one Service.
Main flow: the service stores a Subscription and confirms it.
Error: `DELIVERY_CHANNEL_UNSUPPORTED`, no Subscription created.

- `AC-01`: Email subscription creates one Subscription and confirmation.
- `AC-02`: Unsupported delivery channel is rejected with
  `DELIVERY_CHANNEL_UNSUPPORTED`, no Subscription created.

## UC-02 — Publish a disruption update

Status ready, priority Must, actor `Service operator`, JTBD-01.
Components/contract: solution.components.item-002, contracts.item-002.
Canonical URL: https://example.org/use-cases/UC-02.

Trigger: an operator submits a ServiceUpdate for one Service.
Main flow: the service records and publishes the update.
Errors: N/A — only the confirmed happy-path slice is selected.

- `AC-01`: A submitted disruption update is recorded and published.
