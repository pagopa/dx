---
id: UC-01
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-01`: Consult and retrieve DX guidance

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer or coding agent.

**Secondary actors**: DX team.

**Source artifact**: [Shared offering](../../apps/website/docs/index.md) and [knowledge service](../../apps/mcpserver/README.md).

**Service Blueprint step**: [SB-01 Discover and choose](../service-blueprint.md#sb-01-discover-and-choose).

**Domain entities**: Team, Coding agent, Knowledge artifact.

**Trigger**: The actor needs guidance about a development, infrastructure or operational task.

**Preconditions**:

- The relevant guidance is published and the selected access channel is available.
- The actor supplies a non-empty question when using the question interface.

**Main flow**:

1. The actor submits a question or browses the published guidance.
2. The knowledge capability retrieves relevant material.
3. When relevant, verifiable sources are available, the actor receives guidance or a factual answer with source references.
4. The actor uses the references to inspect the underlying material.

**Alternate flows**:

- `A1`: A caller requests search results rather than a generated answer and receives relevant content with verifiable source references; unresolved material is not presented as grounded.
- `A2`: If no relevant source is verifiable, the actor receives an explicit no-source outcome instead of a factual answer.

**Exception flows / edge cases**:

- `E1`: An empty question is rejected rather than processed -> Error: `QUERY_INVALID`.
- `E2`: A retrieval failure is returned as a failure, not a successful answer -> Error: `KNOWLEDGE_UNAVAILABLE`.
- `E3`: No relevant source can be verified or cited -> Error: `KNOWLEDGE_SOURCE_UNAVAILABLE`, distinct from a service failure.

**Postconditions**:

- The actor receives a sourced answer, an explicit no-source outcome or a service failure; querying does not change the source guidance.
- The current question interface can return an empty answer or source list. The agreed no-source behavior is not yet verified in the implementation.

**Errors**:

- `QUERY_INVALID`: The required question is missing or empty -> the request is rejected without producing an answer.
- `KNOWLEDGE_UNAVAILABLE`: Retrieval or answer generation fails -> the request reports failure; no successful answer is returned.
- `KNOWLEDGE_SOURCE_UNAVAILABLE`: No relevant, verifiable source is available -> the response explicitly reports the absence and does not provide a factual answer or fabricated citation; this is distinct from a service failure.

**Acceptance checks**:

- `AC-01`: Given a successful response with resolvable citations, the question interface returns the answer and the distinct source references derived from those citations. Evidence: [question handler](../../apps/mcpserver/src/handlers/ask.ts).
- `AC-02`: Given an empty question, the question interface rejects it with `QUERY_INVALID` and produces no answer. Evidence: [question validation](../../apps/mcpserver/src/handlers/ask.ts).
- `AC-03`: Given a retrieval failure, the question interface reports `KNOWLEDGE_UNAVAILABLE` rather than a successful answer. Evidence: [question error handling](../../apps/mcpserver/src/handlers/ask.ts).
- `AC-04`: Given no relevant verifiable source, the response explicitly reports `KNOWLEDGE_SOURCE_UNAVAILABLE`, provides no factual answer and does not classify the absence as `KNOWLEDGE_UNAVAILABLE`. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Consumer as Developer or agent
      participant Interface as DX interface
      participant Knowledge as Knowledge layer
      Consumer->>Interface: Ask a question
      Interface->>Knowledge: Retrieve relevant guidance
      Knowledge-->>Interface: Content and available citations
      alt Relevant, verifiable source available
          Interface-->>Consumer: Answer and sources
      else No verifiable source
          Interface-->>Consumer: Explicit no-source outcome
      end
  ```

- Service Blueprint: [SB-01 Discover and choose](../service-blueprint.md#sb-01-discover-and-choose).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-001`, `solution.components.item-002`.
- Interface / data contract: `contracts.item-002`.
- Cross-cutting NFR: `NFR-02` applies to continuously accessible knowledge services; a correctly communicated no-source outcome counts as an availability success, unlike a service or dependency failure. `NFR-06` applies if a DX service is designated critical; `NFR-08` applies to human-facing web content. Classification, measurement and accessibility evidence remain open in parent `open.item-004` and `open.item-006`.
- Validation evidence: [question handler](../../apps/mcpserver/src/handlers/ask.ts), [search handler](../../apps/mcpserver/src/handlers/search.ts).

## Open questions and propagation

| ID           | Type     | Item                                                                                                                                            | Impact / blocker                                                                                                   | Owner            | Resolution / link                                                                                                                         |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `uc-open-01` | Decision | When no relevant verifiable source is available, report its absence and do not provide a factual answer; distinguish it from a service failure. | Current implementation can return an empty answer or source list, so the agreed behavior still needs verification. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; [question handler](../../apps/mcpserver/src/handlers/ask.ts); parent `open.item-005`. |
