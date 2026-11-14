---
id: UC-18
status: draft
priority: Should
parent_dr: ../design-review.md
---

# `UC-18`: Identify resource cost risks

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Resource-owning team or coding agent.

**Secondary actors**: Cloud account owner and cost reviewer.

**Source artifact**: [Cost analysis](../../apps/savemoney/README.md) and [cost guidance](../../apps/website/docs/savemoney/index.md).

**Service Blueprint step**: [SB-06 Observe and operate](../service-blueprint.md#sb-06-observe-and-operate).

**Domain entities**: Team, Cloud account, Resource, Cost finding.

**Trigger**: A team wants to find potentially unused or underutilized resources.

**Preconditions**:

- The actor can read the selected account's resource and usage data.
- The chosen resource types and account are supported by the analysis.

**Main flow**:

1. The actor selects one or more accounts and optional analysis filters.
2. The analysis reads inventory, usage signals and available recommendations.
3. The analysis identifies findings and reports the associated evidence and estimates where available.
4. The team reviews the findings before deciding whether any resource change is appropriate.

**Alternate flows**:

- `A1`: The actor requests a human-readable report or a supported machine-readable report.
- `A2`: Duplicate findings from multiple sources are consolidated according to the documented analysis behavior.

**Exception flows / edge cases**:

- `E1`: The account is missing, inaccessible or unsupported -> Error: `ANALYSIS_SCOPE_UNAVAILABLE`.
- `E2`: Analysis fails -> Error: `COST_ANALYSIS_FAILED`.

**Postconditions**:

- The analysis does not modify, tag or delete resources.
- An estimate of cost at risk is not a promise of savings; recommendation estimates remain distinct.

**Errors**:

- `ANALYSIS_SCOPE_UNAVAILABLE`: A requested account cannot be analyzed -> the actor receives an error rather than an implied complete report.
- `COST_ANALYSIS_FAILED`: The analysis cannot complete -> the process reports failure; empty output is not treated as proof of no findings.

**Acceptance checks**:

- `AC-01`: A successful analysis identifies findings using available resource and usage evidence without modifying the analyzed resources. Evidence: [cost analysis](../../apps/savemoney/README.md).
- `AC-02`: The report distinguishes estimated cost at risk from separately sourced savings recommendations. Evidence: [cost analysis](../../apps/savemoney/README.md).
- `AC-03`: On an unsuccessful automated run, the process reports `COST_ANALYSIS_FAILED`; an empty result alone is not considered a successful no-finding report. Evidence: [automated execution](../../apps/savemoney/README.md).

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Consumer as Team or agent
      participant Analysis as Cost analysis
      participant Sources as Resource and usage sources
      Consumer->>Analysis: Select accounts and filters
      Analysis->>Sources: Read inventory and signals
      Sources-->>Analysis: Observations and recommendations
      Analysis-->>Consumer: Read-only findings and estimates
  ```

- Service Blueprint: [SB-06 Observe and operate](../service-blueprint.md#sb-06-observe-and-operate).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-002`, `solution.components.item-007`.
- Interface / data contract: `contracts.item-008`.
- Validation evidence: [cost analysis](../../apps/savemoney/README.md).

## Open questions and propagation

Supported account and resource coverage is tracked in parent `open.item-001`.
No additional behavior-local question has been identified.
