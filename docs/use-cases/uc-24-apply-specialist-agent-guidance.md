---
id: UC-24
status: draft
priority: Should
parent_dr: ../design-review.md
---

# `UC-24`: Apply specialist agent guidance to engineering work

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer using a coding agent.

**Secondary actors**: Team owning the affected workspace or resources.

**Source artifact**: [Specialist testing guidance](../../plugins/tests/skills/generate-backend-tests/SKILL.md), [infrastructure authoring guidance](../../plugins/terraform/skills/terraform-best-practices/SKILL.md) and [secret-reference guidance](../../plugins/azure/skills/azure-keyvault-reference/SKILL.md).

**Service Blueprint step**: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).

**Domain entities**: Team, Coding agent, Agent capability, Workspace, Resource, Principal and permission.

**Trigger**: A developer requests engineering work covered by an available specialist agent capability.

**Preconditions**:

- The relevant capability and its supporting guidance are available.
- The agent can inspect the target workspace and has authority for the requested actions.

**Main flow**:

1. The developer states the engineering objective and relevant constraints.
2. The coding agent selects the applicable specialist capability and inspects existing context and source evidence.
3. The agent follows the capability's applicable guardrails and reuses relevant existing abstractions.
4. The agent performs authorized changes or provides read-only guidance, according to the available inputs and permissions.
5. The agent verifies the affected behavior using the checks required by that capability and reports the outcome and remaining gaps.

**Alternate flows**:

- `A1`: Testing guidance selects a suitable boundary and existing harness before extending coverage.
- `A2`: Infrastructure guidance checks existing shared abstractions and secret-handling requirements before proposing or applying a change.
- `A3`: When an applicable adoption check is unavailable, a documented existing choice may continue with the gap explicit; a new choice requires restored guidance or authorized confirmation.

**Exception flows / edge cases**:

- `E1`: Required specialist knowledge is unavailable for the documented infrastructure-authoring workflow -> Error: `SPECIALIST_GUIDANCE_UNAVAILABLE`.
- `E2`: A faithful testing approach is available but the agent wants to substitute a less faithful fallback without approval -> Error: `APPROVAL_REQUIRED`.
- `E3`: The agent lacks authority for a requested action -> Error: `ACTION_UNAUTHORIZED`.
- `E4`: The agent attempts to increase its own privileges or disable an applicable control -> Error: `AGENT_GUARDRAIL_VIOLATION`.
- `E5`: An applicable adoption check is unavailable -> Error: `ADOPTION_GUIDANCE_UNAVAILABLE`.

**Postconditions**:

- The agent's result identifies the work performed or the reason it could not proceed.
- A capability being available does not grant permissions or bypass required approvals.
- The agreed policy forbids self-escalation and disabling controls; current enforcement remains to be verified.

**Errors**:

- `SPECIALIST_GUIDANCE_UNAVAILABLE`: Required knowledge for the documented authoring path is missing -> the agent limits itself to read-only advice until the prerequisite is resolved.
- `APPROVAL_REQUIRED`: The documented testing workflow requires approval before a less faithful fallback -> the agent does not silently substitute it.
- `ACTION_UNAUTHORIZED`: The agent lacks required permission -> the protected action is not authorized.
- `AGENT_GUARDRAIL_VIOLATION`: An agent attempts self-escalation or to disable a control -> the action is blocked and failure is reported; enforcement evidence is pending.
- `ADOPTION_GUIDANCE_UNAVAILABLE`: An applicable adoption check cannot complete -> report the verification gap; a new choice waits for restored guidance or authorized confirmation.

**Acceptance checks**:

- `AC-01`: The documented specialist testing workflow inspects existing tests and the relevant boundary before selecting or extending a testing approach. Evidence: [specialist testing guidance](../../plugins/tests/skills/generate-backend-tests/SKILL.md).
- `AC-02`: When the required knowledge base is unavailable, the documented infrastructure-authoring capability reports `SPECIALIST_GUIDANCE_UNAVAILABLE` and remains read-only. Evidence: [infrastructure authoring guidance](../../plugins/terraform/skills/terraform-best-practices/SKILL.md).
- `AC-03`: When a credible faithful testing approach exists, substituting a less faithful fallback without approval remains `APPROVAL_REQUIRED`. Evidence: [specialist testing guidance](../../plugins/tests/skills/generate-backend-tests/SKILL.md).
- `AC-04`: The documented secret-reference guidance avoids placing secret values directly in application configuration and requires an appropriate runtime identity. Evidence: [secret-reference guidance](../../plugins/azure/skills/azure-keyvault-reference/SKILL.md).
- `AC-05`: Given an agent attempting to increase its own privileges or disable a control, the action is blocked and reported as `AGENT_GUARDRAIL_VIOLATION`. Evidence: [agreed agent policy](../design-review.md#solution-design); implementation verification remains in `open.item-002`.
- `AC-06`: When an applicable adoption check returns `ADOPTION_GUIDANCE_UNAVAILABLE`, the agent reports the gap and does not make a new choice without restored guidance or authorized confirmation. Evidence: [UC-22 decision](uc-22-assess-adoption-guidance.md#open-questions-and-propagation); implementation verification remains in parent `open.item-005`.

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Developer
      participant Agent as Coding agent
      participant Guidance as Specialist capability
      participant Workspace
      Developer->>Agent: Request engineering work
      Agent->>Guidance: Select applicable instructions
      Agent->>Workspace: Inspect and act within authority
      Agent->>Workspace: Verify affected behavior
      Agent-->>Developer: Outcome and remaining gaps
  ```

- Service Blueprint: [SB-04 Build, connect and secure](../service-blueprint.md#sb-04-build-connect-and-secure).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-001`, `solution.components.item-004`, `solution.components.item-009`.
- Interface / data contract: `contracts.item-010`.
- Validation evidence: [specialist testing guidance](../../plugins/tests/skills/generate-backend-tests/SKILL.md), [infrastructure authoring guidance](../../plugins/terraform/skills/terraform-best-practices/SKILL.md).

## Open questions and propagation

The inventory of available capabilities and their applicable authorization
boundaries is tracked in parent `open.item-001` and `open.item-002`. No
additional behavior-local question has been identified.
