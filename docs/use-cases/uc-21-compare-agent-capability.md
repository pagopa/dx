---
id: UC-21
status: draft
priority: Should
parent_dr: ../design-review.md
---

# `UC-21`: Compare agent capability quality

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Agent capability maintainer.

**Secondary actors**: Coding agent and evaluation reviewer.

**Source artifact**: [Agent evaluation tool](../../apps/harbor-bench/README.md).

**Service Blueprint step**: [SB-07 Support and evolve](../service-blueprint.md#sb-07-support-and-evolve).

**Domain entities**: Coding agent, Agent capability, Knowledge artifact, Evaluation case and result.

**Trigger**: A maintainer needs to evaluate an agent capability or compare two versions.

**Preconditions**:

- The capability and its evaluation cases are available.
- The selected execution environment and required authority are available.
- Runs must use the same cases and criteria and equivalent execution conditions except for the declared variable under examination.

**Main flow**:

1. The maintainer selects the capability versions, evaluation cases and variable under examination.
2. The evaluation capability converts the cases into executable tasks.
3. The same selected evaluation set is run against each version.
4. The capability records results and checks that the runs are comparable.
5. For comparable runs, the capability produces a comparison of scores and execution measures.
6. A reviewer uses the evidence to decide whether the change is acceptable.

**Alternate flows**:

- `A1`: The maintainer compares existing run results instead of starting new runs.
- `A2`: The maintainer runs a single version when a comparison is not needed.

**Exception flows / edge cases**:

- `E1`: Required evaluation inputs or a selected version cannot be resolved -> Error: `EVALUATION_INPUT_UNAVAILABLE`; exact failure behavior is not established.
- `E2`: A run cannot complete -> Error: `EVALUATION_RUN_FAILED`; incomplete results must not be presented as a completed comparison.
- `E3`: Cases, criteria or execution conditions differ beyond the declared variable -> Error: `EVALUATION_RUNS_INCOMPARABLE`.

**Postconditions**:

- A completed comparison identifies the compared runs and their measured differences.
- The comparison is evidence for a human decision, not an automatic approval.
- Incomplete required work is classified using the agreed `partial` or `failed` outcome semantics; current implementation coverage remains to be verified.
- Incomparable runs are reported with their differences; their deltas are not presented as valid.

**Errors**:

- `EVALUATION_INPUT_UNAVAILABLE`: A required capability version or evaluation input is unavailable -> the affected comparison cannot be completed.
- `EVALUATION_RUN_FAILED`: A run fails or is incomplete -> the result must not be represented as a complete comparison; recovery behavior is unconfirmed.
- `EVALUATION_RUNS_INCOMPARABLE`: Runs differ in cases, criteria or execution conditions beyond the declared variable -> report the differences and do not present their deltas as valid.

**Acceptance checks**:

- `AC-01`: A comparison runs the selected evaluation set against both capability versions and reports per-case differences. Evidence: [agent evaluation tool](../../apps/harbor-bench/README.md).
- `AC-02`: The comparison report includes measures such as score, resource use and duration for the compared runs. Evidence: [agent evaluation tool](../../apps/harbor-bench/README.md).
- `AC-03`: If a required run is incomplete, the comparison reports `EVALUATION_RUN_FAILED` as `partial` when other required work succeeded, or `failed` when no partial result is confirmed; it does not report a complete comparison. Evidence: [agreed outcome policy](../design-review.md#solution-design); implementation verification remains in `uc-open-01`.
- `AC-04`: If runs differ in cases, criteria or execution conditions beyond the declared variable, report `EVALUATION_RUNS_INCOMPARABLE` and the differences without presenting their deltas as valid. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.

**Tracking events**: Evaluation results are recorded by the tool; product analytics tracking is not established, see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Maintainer
      participant Evaluation as Evaluation capability
      participant Cases as Evaluation cases
      participant Agent as Agent versions
      Maintainer->>Evaluation: Select versions and cases
      Evaluation->>Cases: Prepare executable tasks
      Evaluation->>Agent: Run the same selected cases
      Agent-->>Evaluation: Run results
      Evaluation-->>Maintainer: Comparison and evidence
  ```

- Service Blueprint: [SB-07 Support and evolve](../service-blueprint.md#sb-07-support-and-evolve).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-009`, `solution.components.item-010`.
- Interface / data contract: `contracts.item-011`.
- Validation evidence: [agent evaluation tool](../../apps/harbor-bench/README.md); portable failure verification not supplied.

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Decision | Compare runs only when cases, criteria and execution conditions are equivalent except for the declared variable; report differences without presenting incomparable deltas as valid. Incomplete runs use the agreed `partial` / `failed` outcomes. | Current comparability checks and incomplete-run behavior need implementation evidence. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; parent `open.item-005` and `open.item-007`. |
