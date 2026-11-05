---
id: UC-22
status: draft
priority: Should
parent_dr: ../design-review.md
---

# `UC-22`: Assess a technology against adoption guidance

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer or coding agent.

**Secondary actors**: Team responsible for adoption guidance.

**Source artifact**: [Adoption guidance capability](../../plugins/standards/skills/technology-radar/SKILL.md).

**Service Blueprint step**: [SB-01 Discover and choose](../service-blueprint.md#sb-01-discover-and-choose).

**Domain entities**: Team, Coding agent, Knowledge artifact.

**Trigger**: An actor is considering a technology choice for an implementation.

**Preconditions**:

- The adoption guidance is available and the candidate can be identified.
- The team understands that this assessment does not select a technology in the parent design.

**Main flow**:

1. The actor checks the candidate against the current adoption guidance.
2. The guidance identifies the candidate's adoption status when listed.
3. The actor considers the associated recommendation before proposing or implementing the choice.
4. Where the guidance requires an explicit user decision, the actor obtains it before proceeding.

**Alternate flows**:

- `A1`: A candidate marked `adopt` is preferred as a default; `trial` is used with awareness of its limited validation.
- `A2`: A candidate marked `assess` is avoided unless explicitly requested.
- `A3`: An unlisted candidate requires user confirmation; a `hold` candidate requires a warning and explicit confirmation before proceeding.
- `A4`: When guidance is unavailable, a documented existing choice may continue with the verification gap made explicit.

**Exception flows / edge cases**:

- `E1`: The guidance cannot be retrieved -> Error: `ADOPTION_GUIDANCE_UNAVAILABLE`; report the failed assessment and do not claim approval.
- `E2`: A required user confirmation is absent -> Error: `APPROVAL_REQUIRED`.

**Postconditions**:

- The actor can state whether the candidate was listed and what guidance applies.
- An unknown or unavailable status is not represented as an approved status.
- If guidance is unavailable, a new choice waits for restored guidance or confirmation by an authorized decision maker; a documented existing choice may continue with the gap explicit.

**Errors**:

- `ADOPTION_GUIDANCE_UNAVAILABLE`: Current guidance cannot be retrieved -> report the gap and do not claim that a candidate was assessed or approved.
- `APPROVAL_REQUIRED`: A candidate requires explicit confirmation and none has been supplied -> the actor does not proceed as if approval existed.

**Acceptance checks**:

- `AC-01`: A listed candidate is assessed using its recorded adoption status and associated guidance. Evidence: [adoption guidance capability](../../plugins/standards/skills/technology-radar/SKILL.md).
- `AC-02`: An unlisted candidate requires confirmation before selection; without it the decision remains `APPROVAL_REQUIRED`. Evidence: [adoption guidance capability](../../plugins/standards/skills/technology-radar/SKILL.md).
- `AC-03`: A `hold` candidate is accompanied by a warning and requires explicit confirmation before proceeding. Evidence: [adoption guidance capability](../../plugins/standards/skills/technology-radar/SKILL.md).
- `AC-04`: If guidance cannot be retrieved, the actor reports `ADOPTION_GUIDANCE_UNAVAILABLE` and does not claim the candidate was assessed or approved. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.
- `AC-05`: With guidance unavailable and no authorized confirmation, a new choice remains `APPROVAL_REQUIRED`; a documented existing choice may continue only with the verification gap explicit. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Consumer as Developer or agent
      participant Guidance as Adoption guidance
      actor DecisionMaker as Authorized decision maker
      Consumer->>Guidance: Assess candidate
      Guidance-->>Consumer: Status and recommendation
      opt Confirmation required
          Consumer->>DecisionMaker: Request confirmation
          DecisionMaker-->>Consumer: Decision
      end
  ```

- Service Blueprint: [SB-01 Discover and choose](../service-blueprint.md#sb-01-discover-and-choose).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-001`, `solution.components.item-009`, `solution.components.item-011`.
- Interface / data contract: `contracts.item-012`.
- Validation evidence: [adoption guidance capability](../../plugins/standards/skills/technology-radar/SKILL.md).

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Decision | Report unavailable guidance and do not claim an assessment or approval. New choices wait for restored guidance or authorized confirmation; documented existing choices may continue with the gap explicit. | The agreed unavailable-guidance behavior needs implementation evidence. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; parent `open.item-005`. |
