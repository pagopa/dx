---
id: UC-02
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-02`: Discover and invoke DX capabilities

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer or coding agent.

**Secondary actors**: DX team.

**Source artifact**: [CLI overview](../../apps/cli/README.md), [capability description](../../apps/cli/src/domain/spec.ts) and [environment command](../../apps/cli/src/adapters/commander/commands/add.ts).

**Service Blueprint step**: [SB-01 Discover and choose](../service-blueprint.md#sb-01-discover-and-choose).

**Domain entities**: Coding agent, Knowledge artifact, Workspace, Environment.

**Trigger**: The actor needs to find an available operation and execute it through a supported interface.

**Preconditions**:

- The capability description and the selected operation are available.
- The caller has the inputs and permissions required by that operation.

**Main flow**:

1. The actor retrieves the machine-consumable capability description.
2. The actor identifies an operation, its arguments, options and required inputs.
3. The actor invokes a supported operation with the applicable inputs and authority.
4. The interface returns the operation's outcome in a human-readable or supported structured form.

**Alternate flows**:

- `A1`: A human uses guided prompts where the operation supports them.
- `A2`: An automation supplies inputs in advance where the operation supports non-interactive execution.

**Exception flows / edge cases**:

- `E1`: An operation rejects invalid inputs -> Error: `INPUT_INVALID`.
- `E2`: An operation cannot complete because its required authorization is absent -> Error: `ACTION_UNAUTHORIZED`.
- `E3`: An agent attempts to increase its own privileges or disable an applicable control -> Error: `AGENT_GUARDRAIL_VIOLATION`.

**Postconditions**:

- The actor can distinguish an operation's reported success from failure.
- The description does not imply that every operation has a non-interactive mode.
- The agreed policy forbids agent self-escalation and disabling controls; current enforcement remains to be verified.
- Agent-accessible operations require machine-readable success and failure results under the agreed behavioral contract; current coverage remains to be verified.
- The agreed outcome policy distinguishes `success`, `partial` and `failed` and reports known and uncertain step outcomes or effects; current coverage remains to be verified.

**Errors**:

- `INPUT_INVALID`: Inputs do not meet the selected operation's constraints -> execution is rejected and an error is returned.
- `ACTION_UNAUTHORIZED`: The caller lacks the authorization required by the selected operation -> the operation reports the authorization failure; partial effects depend on the flow.
- `AGENT_GUARDRAIL_VIOLATION`: An agent attempts self-escalation or to disable a control -> the action is blocked and failure is reported; enforcement evidence is pending.

**Acceptance checks**:

- `AC-01`: The capability description identifies available operations and their arguments, options and descriptions in a machine-consumable form. Evidence: [capability schema](../../apps/cli/src/domain/spec.ts).
- `AC-02`: When a supported environment operation receives invalid inputs, it reports `INPUT_INVALID` rather than a successful environment result. Evidence: [input validation](../../apps/cli/src/adapters/commander/commands/add.ts).
- `AC-03`: When the caller selects a documented structured-result mode, a supported operation returns a machine-consumable outcome. Evidence: [environment output tests](../../apps/cli/src/adapters/commander/commands/__tests__/add-json.test.ts).
- `AC-04`: Given an agent attempting to increase its own privileges or disable a control, the action is blocked and reported as `AGENT_GUARDRAIL_VIOLATION`. Evidence: [agreed agent policy](../design-review.md#solution-design); implementation verification remains in `open.item-002`.
- `AC-05`: For an agent-accessible operation, both success and failure produce a machine-readable result, and failure includes a semantic error category. Evidence: [agreed contract policy](../design-review.md#solution-design); implementation verification remains in `open.item-005`.
- `AC-06`: When at least one required step succeeds and another remains incomplete, the result is `partial` and identifies known and uncertain outcomes or effects. Evidence: [agreed outcome policy](../design-review.md#solution-design); implementation verification remains in `open.item-007`.

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Consumer as Developer or agent
      participant Interface as DX interface
      participant Capability as Selected capability
      Consumer->>Interface: Discover operations
      Interface-->>Consumer: Descriptions and inputs
      Consumer->>Interface: Invoke supported operation
      Interface->>Capability: Execute within authority
      Capability-->>Consumer: Result or error
  ```

- Service Blueprint: [SB-01 Discover and choose](../service-blueprint.md#sb-01-discover-and-choose).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-002`, `solution.components.item-003`.
- Interface / data contract: `contracts.item-001`, `contracts.item-003`.
- Cross-cutting NFR: `NFR-02` measures on-demand interfaces by execution success; the numerical target remains open in parent `open.item-004`.
- Validation evidence: [capability description tests](../../apps/cli/src/adapters/commander/__tests__/spec.test.ts), [environment output tests](../../apps/cli/src/adapters/commander/commands/__tests__/add-json.test.ts).

## Open questions and propagation

The shared capability coverage, authorization and portable error-contract gaps
are tracked in parent `open.item-001`, `open.item-002` and `open.item-005`.
No additional behavior-local question has been identified.
