---
id: UC-09
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-09`: Grant scoped access to resources

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Authorized resource owner, developer or delegated coding agent.

**Secondary actors**: Principal receiving access and cloud account owner.

**Source artifact**: [Access abstractions](../../infra/modules/azure_role_assignments/README.md) and [automation identity guidance](../../infra/modules/azure_federated_identity_with_github/README.md).

**Service Blueprint step**: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).

**Domain entities**: Team, Coding agent, Cloud account, Resource, Principal and permission.

**Trigger**: A person, workload or automation needs access to a supported resource.

**Preconditions**:

- The principal and target resource are identified.
- The requesting actor has authority to configure the relevant permission.
- The resource-owning team defines applicable permissions and approval gates within the common DX guardrails.

**Main flow**:

1. The actor identifies the principal, target resource, requested role, scope and purpose.
2. The access abstraction maps a supported role intent to the documented actions and scope applicable to that resource type.
3. An authorized change creates the scoped assignment.
4. The actor can inspect the declared assignment, its purpose and the execution outcome.

**Alternate flows**:

- `A1`: The actor assigns permissions to several supported resources for the same principal.
- `A2`: A supported automation identity uses federation rather than a long-lived shared password.
- `A3`: An agent may configure another principal's assignment within its delegated authority and applicable approvals.

**Exception flows / edge cases**:

- `E1`: A role outside the supported set is rejected -> Error: `ROLE_INVALID`.
- `E2`: The actor lacks authority to create the assignment -> Error: `ACTION_UNAUTHORIZED`.
- `E3`: An agent attempts to grant itself additional privileges -> Error: `AGENT_GUARDRAIL_VIOLATION`.
- `E4`: A resource-specific approval gate has not been satisfied -> Error: `APPROVAL_REQUIRED`.

**Postconditions**:

- A successful assignment applies to the selected principal and resource scope.
- Permission semantics remain resource-specific; private connectivity alone does not grant application access.
- The agreed agent policy prohibits self-escalation; current enforcement remains to be verified.
- Generic role names express intent, not identical permissions across resource types; equivalent implementations preserve the specified actions and scope rather than provider-specific role names.

**Errors**:

- `ROLE_INVALID`: A role value is unsupported for the selected abstraction -> validation rejects the assignment.
- `ACTION_UNAUTHORIZED`: The caller lacks the authority required to change access -> the request is not an approved grant.
- `AGENT_GUARDRAIL_VIOLATION`: An agent attempts to grant itself additional privileges -> the assignment is blocked and failure is reported; enforcement evidence is pending.
- `APPROVAL_REQUIRED`: The owning team's applicable approval has not been granted -> the protected assignment remains pending.

**Acceptance checks**:

- `AC-01`: A supported assignment declaration includes a principal, role, target scope and description of its purpose. Evidence: [access abstractions](../../infra/modules/azure_role_assignments/README.md).
- `AC-02`: For the documented supported resource assignments, an unsupported role is rejected as `ROLE_INVALID`. Evidence: [role validation](../../infra/modules/azure_role_assignments/modules/apim/variables.tf).
- `AC-03`: For the documented automation-identity flow, the configured identity can use federation with explicitly scoped roles. Evidence: [automation identity guidance](../../infra/modules/azure_federated_identity_with_github/README.md).
- `AC-04`: Given an agent requesting additional privileges for itself, the assignment is blocked and reported as `AGENT_GUARDRAIL_VIOLATION`. Evidence: [agreed agent policy](../design-review.md#solution-design); implementation verification remains in `open.item-002`.
- `AC-05`: When the resource-owning team's policy requires approval for an assignment, the assignment remains `APPROVAL_REQUIRED` until that gate is satisfied. Evidence: [agreed control ownership](../design-review.md#solution-design); implementation verification remains in `open.item-002`.
- `AC-06`: For each supported resource type and role intent, the behavioral contract specifies the permitted actions and scope; an equivalent implementation preserves those actions rather than provider-specific role names. Evidence: stakeholder decision in `uc-open-01`; per-resource contract evidence remains in parent `open.item-005`.

**Tracking events**:

- `audit_sensitive_operation` (proposed event identifier): when an access change is designated sensitive, record actor, resource, time, outcome and applicable approvals without secrets. Channel: system; purpose: accountability; status: policy agreed, implementation and retention unverified. See `contracts.item-014` and parent `open.item-003`.
- Product analytics events are not inventoried; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Owner as Authorized resource owner
      participant Access as Access abstraction
      participant Cloud as Resource and identity service
      Owner->>Access: Specify principal, role, scope and purpose
      Access->>Cloud: Apply authorized assignment
      Cloud-->>Access: Assignment outcome
      Access-->>Owner: Scoped result
  ```

- Service Blueprint: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-004`.
- Interface / data contract: `contracts.item-005`, `contracts.item-014`.
- Validation evidence: [access abstractions](../../infra/modules/azure_role_assignments/README.md), [role validation](../../infra/modules/azure_role_assignments/modules/apim/variables.tf).

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Decision | Specify permitted actions and scope per resource type and role intent; equivalent implementations preserve those actions rather than provider-specific role names. | Similar role labels do not imply identical permissions across services; the concrete per-resource mapping still needs evidence. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; [access abstractions](../../infra/modules/azure_role_assignments/README.md); parent `open.item-005`. |
