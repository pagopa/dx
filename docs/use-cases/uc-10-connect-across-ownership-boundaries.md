---
id: UC-10
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-10`: Establish private connectivity across ownership boundaries

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Team requesting a private connection.

**Secondary actors**: Team owning the destination resource.

**Source artifact**: [Private connection guide](../../apps/website/docs/azure/networking/peps-cross-subscription.md) and [cross-boundary access guidance](../../apps/website/docs/azure/iam/iam-cross-subscription.md).

**Service Blueprint step**: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).

**Domain entities**: Team, Cloud account, Resource, Connection, Principal and permission.

**Trigger**: A team needs private network connectivity to a resource owned by another team.

**Preconditions**:

- The source and destination resource are identifiable and the teams have the access needed to request and review the connection.
- Applicable network configuration and resource-specific prerequisites are available.
- Each resource-owning team governs permissions and approval gates in its scope within the common DX guardrails.

**Main flow**:

1. The requesting team defines and owns the private connection in its own workspace.
2. Applying the connection configuration creates a request for the destination.
3. The destination owner reviews and approves the request.
4. Once approved, the connection can be used subject to separately configured application permissions.

**Alternate flows**:

- `A1`: Several applications owned by the requesting team can share the documented connection to the same destination.
- `A2`: A target may be referenced by a supported identifier or lookup, subject to the permissions required by that lookup.
- `A3`: While the destination owner reviews the request, the connection remains pending.

**Exception flows / edge cases**:

- `E1`: The destination owner rejects the request -> Error: `CONNECTION_NOT_APPROVED`.
- `E2`: The requesting identity lacks required access to resolve or configure the target -> Error: `ACTION_UNAUTHORIZED`.

**Postconditions**:

- An approved connection supplies network connectivity for the documented scenario.
- Connectivity is not itself an authorization grant to use the destination.

**Errors**:

- `CONNECTION_NOT_APPROVED`: The destination owner rejects the request -> the connection is not treated as approved.
- `ACTION_UNAUTHORIZED`: An identity lacks required access to the target or configuration -> the affected step cannot complete.

**Acceptance checks**:

- `AC-01`: In the documented cross-owner scenario, the requesting team owns the connection definition and the destination owner approves its activation. Evidence: [private connection guide](../../apps/website/docs/azure/networking/peps-cross-subscription.md).
- `AC-02`: A pending or rejected request is not represented as an approved connection; rejection is classified as `CONNECTION_NOT_APPROVED`. Evidence: [private connection guide](../../apps/website/docs/azure/networking/peps-cross-subscription.md).
- `AC-03`: A private connection does not replace the separately required resource permission. Evidence: [cross-boundary access guidance](../../apps/website/docs/azure/iam/iam-cross-subscription.md).

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Requester as Requesting team
      participant Connection as Private connection
      actor Owner as Destination owner
      Requester->>Connection: Define and request connection
      Connection->>Owner: Request approval
      Owner-->>Connection: Approve or reject
      Connection-->>Requester: Connection status
  ```

- Service Blueprint: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-004`, `solution.components.item-013`.
- Interface / data contract: `contracts.item-005`.
- Validation evidence: [private connection guide](../../apps/website/docs/azure/networking/peps-cross-subscription.md), [access guidance](../../apps/website/docs/azure/iam/iam-cross-subscription.md).

## Open questions and propagation

The coverage of supported resource types and approval policies is tracked in
parent `open.item-001` and `open.item-002`. No additional behavior-local
question has been identified.
