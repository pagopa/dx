---
title: "Generate and review QA validation from the source contract"
id: UC-04
status: candidate
---

# `UC-04` - Generate and review QA validation from the source contract

## Traceability

| Field | Value |
| --- | --- |
| `uc.id` | `UC-04` |
| `uc.title` | Generate and review QA validation from the source contract |
| `uc.status` | candidate |
| `uc.priority` | Must |
| `uc.linked-jtbd` | `objectives.jtbd.item-004` |
| `uc.parent-dr` | [Local Design Review](../design-review.md); [Confluence Design Review](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206840661) |
| `uc.source-artifact` | [PRD](../prd.md); [Confluence PRD](https://pagopa.atlassian.net/wiki/spaces/~612f44d3be9e4d00695b0008/pages/3206414774) |
| `uc.service-blueprint-step` | N/A - no Service Blueprint was supplied; the pilot workflow discovery is still open |

## Actors

| Role | Actor name from PRD | Responsibility |
| --- | --- | --- |
| Primary actor | QA practitioner | Review generated test cases, add coverage based on QA expertise, execute validation, and record evidence. |
| Secondary actor | Engineer | Provide the implementation and test environment context and resolve defects or testability gaps. |

## Behavior contract

**Trigger**: The implementation Pull Request and its source requirement and design contracts are available for QA validation.

**Preconditions**:

- QA can access the current structured requirement, design handoff, implementation change, and applicable quality guardrails.
- A validation environment and test-data policy are available or explicitly marked as unresolved.
- The contract for generated test cases and the test-case execution system are not yet supplied.

**Main flow**:

1. QA practitioner confirms the source requirement, design handoff, implementation version, and validation scope.
2. The validation capability generates an initial set of test cases from the same source contract used by the delivery team. This capability is proposed and its exact interface is TBD.
3. QA practitioner reviews the generated test cases for functional coverage, risk, accessibility, security, privacy, and user empathy.
4. QA practitioner adds or modifies test cases where generated coverage is incomplete or inappropriate.
5. QA practitioner executes the agreed validation and records evidence and defects.
6. Engineer receives linked failures and updates the implementation or source contract as required.
7. QA practitioner records the validation outcome and exposes the evidence for release readiness.

**Alternate flows**:

- `A1`: If generated test cases duplicate existing coverage, QA practitioner consolidates them and records the resulting coverage.
- `A2`: If the source contract is incomplete, QA practitioner returns the item to Product or Design and does not infer missing product behavior.
- `A3`: If no generation capability is available, QA practitioner creates the initial test cases manually and records the fallback path.

**Exception flows / edge cases**:

- `E1`: If required test data contains restricted information, QA practitioner uses approved data or blocks execution pending a Privacy decision.
- `E2`: If the test environment or required dependency is unavailable, the affected check is marked blocked with evidence rather than passed.
- `E3`: If a security, privacy, accessibility, or usability issue is identified, release readiness remains blocked until resolution or an approved exception.
- `E4`: If implementation changes after test execution, affected tests and evidence are invalidated or re-run according to a rule that is not yet defined.

**Postconditions**:

- Test cases, execution results, defects, and unresolved validation gaps are traceable to the source requirement and implementation versions.
- QA has recorded a release-readiness recommendation or an explicit block with its reason.

## Acceptance checks

Each check must be binary, independently verifiable, and stable across
updates. Link it to evidence or a test when available.

- `AC-UC-04-01`: QA validation cannot be marked complete when the source requirement or implementation version is missing. - Evidence: TBD
- `AC-UC-04-02`: Every generated test case is traceable to at least one requirement, guardrail, or design decision. - Evidence: Test-case contract TBD
- `AC-UC-04-03`: QA practitioner can record additions, changes, or rejection of generated test cases before execution. - Evidence: TBD
- `AC-UC-04-04`: A failed or blocked validation check is visible in release-readiness evidence and cannot be represented as passed. - Evidence: QA/reporting contract TBD
- `AC-UC-04-05`: Security, privacy, accessibility, and usability checks applicable to the initiative are represented or explicitly recorded as not applicable with a reason. - Evidence: Review checklist TBD

## Tracking events

| Event ID / name | Trigger or flow step | Channel / source | Purpose | Status |
| --- | --- | --- | --- | --- |
| `qa_validation_started` | Main flow step 1 | QA / toolchain | Measure validation lead time and workload. | Proposed |
| `qa_test_cases_generated` | Main flow step 2 | System / agent audit | Measure generated coverage and credit consumption. | Proposed |
| `qa_test_case_reviewed` | Main flow step 3 | QA toolchain | Measure human review and refinement. | Proposed |
| `qa_validation_executed` | Main flow step 5 | QA / test system | Measure validation execution and outcomes. | Proposed |
| `qa_release_readiness_recorded` | Main flow step 7 | Release / QA system | Link evidence to release readiness. | Proposed |

## Relevant links

- Sequence diagram: TBD
- Figma / design flow: TBD - source design handoff contract is not defined
- Endpoint / OpenAPI / AsyncAPI / Data Contract: TBD - test-case and validation evidence contracts are not defined
- Validation evidence: TBD

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | Question | What is the canonical generated test-case contract and where is its source-of-truth stored? | Blocks generation, traceability, and execution integration. | TBD | PRD `open-questions.item-010` |
| `uc-open-02` | Question | Which security, privacy, accessibility, and usability checks are mandatory for each pilot initiative? | Blocks completeness and binary validation. | TBD | PRD `open-questions.item-005` |
| `uc-open-03` | Question | Which test data, environments, and external dependencies are approved for agent-assisted generation and QA execution? | Blocks Privacy review and operational validation. | TBD | PRD `open-questions.item-007` |
| `uc-open-04` | Question | How are test evidence and failures invalidated when the implementation or source contract changes? | Blocks evidence lifecycle and release readiness. | TBD | TBD |
| `uc-open-05` | Assumption | QA practitioner retains authority to add or reject generated tests based on risk and user empathy. | Defines human accountability and coverage quality. | TBD | PRD `objectives.jtbd.item-004` |
