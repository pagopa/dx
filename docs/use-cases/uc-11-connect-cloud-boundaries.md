---
id: UC-11
status: draft
priority: Should
parent_dr: ../design-review.md
---

# `UC-11`: Connect environments across cloud boundaries

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Infrastructure team.

**Secondary actors**: Owners of the participating cloud accounts.

**Source artifact**: [Cross-cloud connectivity guidance](../../apps/website/docs/multi-csp/index.md).

**Service Blueprint step**: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).

**Domain entities**: Team, Environment, Cloud account, Resource, Connection.

**Trigger**: A team needs private communication between supported environments in different cloud boundaries.

**Preconditions**:

- The participating networks and permissions exist.
- Network address ranges do not overlap, and name resolution and traffic rules have been planned.
- The particular cloud pairing and topology are supported.

**Main flow**:

1. The team identifies the participating networks and their ownership.
2. The setup checks that the network address ranges do not overlap before making connection-related changes.
3. The team configures a supported private, encrypted connection between them.
4. The configuration establishes the documented routes and private name-resolution support.
5. The team verifies connectivity and monitors the connection.

**Alternate flows**:

- `A1`: A single connection is used for development or prototyping.
- `A2`: A redundant topology is selected where production resilience is required and supported.

**Exception flows / edge cases**:

- `E1`: Address ranges overlap or required prerequisites are absent -> Error: `NETWORK_PREREQUISITE_INVALID`. Overlapping ranges must be rejected before connection-related changes.
- `E2`: A connection cannot be established -> Error: `CONNECTION_FAILED`; recovery behavior is not established.

**Postconditions**:

- Supported networks can communicate through the configured private connection.
- Data synchronization and common delivery automation are not implied by connectivity.
- When ranges overlap, no changes related to the connection are made; current enforcement remains unverified.

**Errors**:

- `NETWORK_PREREQUISITE_INVALID`: An essential network prerequisite is unmet -> the connection is not represented as a verified supported setup. If ranges overlap, the operation reports the conflict before making connection-related changes.
- `CONNECTION_FAILED`: The connection cannot be established or verified -> the team investigates the connection; automatic recovery is not established.

**Acceptance checks**:

- `AC-01`: For the documented supported pairing, configured networks can be connected using private encrypted links and the documented routing and name-resolution capabilities. Evidence: [cross-cloud connectivity guidance](../../apps/website/docs/multi-csp/index.md).
- `AC-02`: The documented guidance identifies non-overlapping address ranges as a prerequisite and distinguishes a single connection from a redundant topology. Evidence: [cross-cloud connectivity guidance](../../apps/website/docs/multi-csp/index.md).
- `AC-03`: When address ranges overlap, the operation reports `NETWORK_PREREQUISITE_INVALID` before making any change related to the connection. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Team as Infrastructure team
      participant First as First cloud boundary
      participant Connection as Private connection
      participant Second as Second cloud boundary
      Team->>Connection: Configure supported topology
      Connection->>First: Establish private route
      Connection->>Second: Establish private route
      Team->>Connection: Verify connectivity
      Connection-->>Team: Verification outcome
  ```

- Service Blueprint: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-004`, `solution.components.item-013`.
- Interface / data contract: `contracts.item-004`, `contracts.item-005`, `contracts.item-015`.
- Validation evidence: [cross-cloud connectivity guidance](../../apps/website/docs/multi-csp/index.md); portable execution evidence not supplied.

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Decision | Detect overlapping network ranges before connection-related changes; report the conflict and make no such changes. | The examined implementation does not show a dedicated overlap check; the agreed behavior needs implementation evidence. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; [configuration inputs](../../infra/modules/aws_azure_vpn/variables.tf); parent `open.item-005`. |
