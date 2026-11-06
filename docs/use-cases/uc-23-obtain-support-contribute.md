---
id: UC-23
status: draft
priority: Should
parent_dr: ../design-review.md
---

# `UC-23`: Obtain support and contribute improvements

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Team using or contributing to DX.

**Secondary actors**: DX support and maintainers.

**Source artifact**: [Support guide](../../apps/website/docs/support.md), [contribution guidance](../../CONTRIBUTING.md) and [tooling lifecycle](../../apps/website/docs/tooling-lifecycle.mdx).

**Service Blueprint step**: [SB-07 Support and evolve](../service-blueprint.md#sb-07-support-and-evolve).

**Domain entities**: Team, Workspace, Change and validation result, Knowledge artifact.

**Trigger**: A team needs help, wants to report a problem or proposes an improvement to a shared capability.

**Preconditions**:

- The team can identify the relevant capability and access a documented support or contribution channel.
- The agreed baseline requires a documented technical owner and support channel for each shared capability; actual assignments remain open in parent `open.item-006`.

**Main flow**:

1. The team consults the available guidance and identifies the affected capability and version.
2. The team selects a documented channel for a question, defect, request or contribution.
3. The team provides enough context for maintainers to understand the request.
4. DX maintainers review the request or contribution and respond through the selected process.
5. The team follows the outcome and any applicable migration or lifecycle guidance.

**Alternate flows**:

- `A1`: A team following a guided path uses a documented direct support channel.
- `A2`: A contributor proposes a workspace change for review instead of requesting support.
- `A3`: A team checks whether a version is active, in maintenance, deprecated or at end of life before planning a migration.

**Exception flows / edge cases**:

- `E1`: The designated primary support channel is unavailable -> Error: `SUPPORT_CHANNEL_UNAVAILABLE`; report the failure without automatically routing to a fallback.
- `E2`: A capability version is out of support -> Error: `VERSION_UNSUPPORTED`; compatibility is no longer guaranteed.

**Postconditions**:

- A request or contribution reaches the selected process when the channel is available.
- The published guidance does not establish a universal support response time.
- If the primary support channel is unavailable, report the failure and do not claim the request was delivered or automatically use a fallback channel.

**Errors**:

- `SUPPORT_CHANNEL_UNAVAILABLE`: The primary channel cannot receive a request or delivery cannot be confirmed -> report the failure, do not claim delivery and do not automatically use a fallback channel.
- `VERSION_UNSUPPORTED`: The selected version has reached end of life -> support and compatibility are no longer guaranteed.

**Acceptance checks**:

- `AC-01`: The documented support offering identifies channels for questions, defects and requests, and covers shared infrastructure, delivery, tooling, collaboration and documentation. Evidence: [support guide](../../apps/website/docs/support.md).
- `AC-02`: Lifecycle guidance distinguishes active, maintenance, deprecated and end-of-life states; an end-of-life version is identified as `VERSION_UNSUPPORTED`. Evidence: [tooling lifecycle](../../apps/website/docs/tooling-lifecycle.mdx).
- `AC-03`: A contributor can find the documented contribution path for proposing a change. Evidence: [contribution guidance](../../CONTRIBUTING.md).
- `AC-04`: Each shared capability identifies its technical owner and documented support channel. Evidence: [agreed support baseline](../design-review.md#solution-design); assignment verification remains in `open.item-006`.
- `AC-05`: If the primary support channel is unavailable, report `SUPPORT_CHANNEL_UNAVAILABLE` without claiming delivery or automatically routing to a fallback. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-006`.
- `AC-06`: A consumer can find the supported major versions, communicated end of support and migration guidance for each capability. Evidence: [agreed lifecycle policy](../design-review.md#solution-design); per-capability evidence remains in `open.item-005`.

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Team as Using or contributing team
      participant Channel as Support or contribution channel
      actor Maintainer as DX maintainer
      Team->>Channel: Submit question, issue or change
      Channel->>Maintainer: Deliver request
      Maintainer-->>Team: Review outcome or guidance
  ```

- Service Blueprint: [SB-07 Support and evolve](../service-blueprint.md#sb-07-support-and-evolve).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-001`, `solution.components.item-011`.
- Interface / data contract: `contracts.item-012`.
- Validation evidence: [support guide](../../apps/website/docs/support.md), [tooling lifecycle](../../apps/website/docs/tooling-lifecycle.mdx).

## Open questions and propagation

| ID           | Type     | Item                                                                                                                                                          | Impact / blocker                                                                           | Owner            | Resolution / link                                                           |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------- |
| `uc-open-01` | Decision | Use the designated primary support channel only; when it is unavailable, report the failure without claiming delivery or automatically routing to a fallback. | The agreed unavailable-channel behavior needs implementation and support-process evidence. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; parent `open.item-006`. |
