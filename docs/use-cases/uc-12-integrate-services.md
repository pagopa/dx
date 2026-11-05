---
id: UC-12
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-12`: Integrate services securely

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Service-owning team.

**Secondary actors**: Producing and consuming teams.

**Source artifact**: [Service integration guidance](../../apps/website/docs/azure/integrating-services/index.md), [messaging guidance](../../apps/website/docs/azure/integrating-services/using-service-bus.md) and [authenticated service calls](../../apps/website/docs/azure/integrating-services/apim-function-app-authentication.md).

**Service Blueprint step**: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).

**Domain entities**: Team, Service and release, Resource, Principal and permission.

**Trigger**: A team needs services to exchange information across a supported integration boundary.

**Preconditions**:

- The participating services and integration resources are identified.
- The owners can configure the required identities and permissions.

**Main flow**:

1. The team chooses a documented communication pattern appropriate to the services.
2. Resource owners configure the interaction and assign producer and consumer permissions.
3. A producing service sends a request, message or event.
4. The intended consumer receives the interaction under the configured access policy.
5. The teams inspect failures using the capabilities of the selected pattern.

**Alternate flows**:

- `A1`: A queue distributes messages among competing consumers, while a topic distributes copies to its subscriptions.
- `A2`: An authenticated service request uses the caller's identity and verifies the intended recipient and permitted caller.
- `A3`: A resource event triggers a service, with configured retry and failed-event handling where the documented pattern supports them.

**Exception flows / edge cases**:

- `E1`: A request lacks valid authentication -> Error: `AUTHENTICATION_FAILED`.
- `E2`: An authenticated principal lacks the required resource permission -> Error: `ACTION_UNAUTHORIZED`.
- `E3`: An event cannot be delivered after the configured handling attempts -> Error: `DELIVERY_FAILED`.

**Postconditions**:

- A successful interaction reaches the intended authorized consumer in the selected pattern.
- This DR does not prescribe delivery, ordering or recovery guarantees for service-integration patterns. Documented retry and failure-handling options describe available capabilities, not universal guarantees.
- When retries are used, the agreed cross-cutting retry safety policy still applies.

**Errors**:

- `AUTHENTICATION_FAILED`: The caller does not supply valid authentication -> the protected interaction is rejected.
- `ACTION_UNAUTHORIZED`: The authenticated principal lacks required access -> the protected interaction is rejected.
- `DELIVERY_FAILED`: A supported delivery pattern cannot deliver an event -> the configured failed-event handling is used when present; application recovery is not assumed.

**Acceptance checks**:

- `AC-01`: In the documented messaging scenario, producer and consumer permissions can be configured separately. Evidence: [messaging guidance](../../apps/website/docs/azure/integrating-services/using-service-bus.md).
- `AC-02`: In the documented authenticated-call scenario, a request without valid authentication is rejected as `AUTHENTICATION_FAILED`. Evidence: [authenticated service calls](../../apps/website/docs/azure/integrating-services/apim-function-app-authentication.md).
- `AC-03`: In the documented event scenario, retry and failed-event destination settings can be configured for `DELIVERY_FAILED`. Evidence: [event integration guidance](../../apps/website/docs/azure/integrating-services/eventgrid-storage-functions.md).

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Owner as Service-owning team
      participant Sender as Producing service
      participant Integration as Integration boundary
      participant Receiver as Consuming service
      Owner->>Integration: Configure interaction and permissions
      Sender->>Integration: Send authorized interaction
      Integration->>Receiver: Deliver to intended consumer
      Integration-->>Owner: Outcome or delivery failure
  ```

- Service Blueprint: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-004`, `solution.components.item-013`.
- Interface / data contract: `contracts.item-005`, `contracts.item-013`.
- Validation evidence: [messaging guidance](../../apps/website/docs/azure/integrating-services/using-service-bus.md), [event integration guidance](../../apps/website/docs/azure/integrating-services/eventgrid-storage-functions.md).

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Decision | Do not prescribe delivery, ordering or recovery guarantees for service-integration patterns. Retain the documented retry and failure-handling options as capabilities, not universal guarantees. | Common retry safety still applies when retries are used; documented options do not establish guaranteed delivery or ordering. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; [messaging guidance](../../apps/website/docs/azure/integrating-services/using-service-bus.md). |
