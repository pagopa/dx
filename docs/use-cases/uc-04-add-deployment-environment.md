---
id: UC-04
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-04`: Add a deployment environment

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Developer or coding agent.

**Secondary actors**: Cloud account owner and repository owner.

**Source artifact**: [Environment model](../../apps/cli/src/domain/environment.ts), [environment command](../../apps/cli/src/adapters/commander/commands/add.ts) and [environment output tests](../../apps/cli/src/adapters/commander/commands/__tests__/add-json.test.ts).

**Service Blueprint step**: [SB-03 Prepare workspace and environment](../service-blueprint.md#sb-03-prepare-workspace-and-environment).

**Domain entities**: Workspace, Environment, Cloud account, Infrastructure state, Principal and permission.

**Trigger**: A team needs an additional lifecycle environment for its workspace.

**Preconditions**:

- The workspace exists and the actor can supply an environment identity, prefix and at least one supported cloud account.
- The caller has the authority needed for each selected initialization action.

**Main flow**:

1. The actor supplies or selects the environment and account details.
2. The setup validates the inputs and checks initialization and state-storage needs.
3. The setup generates environment configuration and obtains or provisions the required state backend.
4. Where account authorization requests are needed, the setup attempts them and returns links to requests that were created.
5. The setup reports the generated environment, non-secret state metadata and an explicit authorization outcome for each selected account.
6. The overall result is `success` only when all required steps have succeeded and every required account authorization is verified as approved or not required.

**Alternate flows**:

- `A1`: An existing state backend is reused instead of provisioned.
- `A2`: A qualified environment name retains its full identity while its final segment determines the lifecycle.
- `A3`: Supported inputs can be supplied in advance instead of being collected interactively.
- `A4`: A transient failure may be retried automatically only within a bounded policy when repeating the step is safe; uncertain effects are verified before retrying.

**Exception flows / edge cases**:

- `E1`: Invalid environment or account inputs are rejected -> Error: `INPUT_INVALID`.
- `E2`: An account authorization request fails; the current flow logs a warning and continues with any other requests -> Error: `AUTHORIZATION_REQUEST_INCOMPLETE`.
- `E3`: Environment generation fails -> Error: `ENVIRONMENT_SETUP_FAILED`.
- `E4`: A required account authorization is awaiting approval -> Error: `AUTHORIZATION_PENDING`.
- `E5`: A required account authorization cannot be verified -> Error: `AUTHORIZATION_STATUS_UNKNOWN`.

**Postconditions**:

- A successful result identifies the generated environment and available non-secret backend metadata.
- Each selected account has one explicit authorization outcome: `not_required`, `pending`, `approved`, `failed` or `unverifiable`. An approval is reported only when verified.
- A configured environment remains `partial` while a required authorization is pending, failed or unverifiable; if no partial result is confirmed, the overall outcome is `failed`.
- A correctly communicated pending approval is an expected availability response for a continuously accessible interface, not proof that the environment is ready; on-demand execution success is assessed separately.
- Partial setup may remain after failure; see parent `open.item-007`.
- The agreed security baseline excludes secret values from outputs and logs. The structured-output test covers a specific payload; broader coverage remains unverified in parent `open.item-003`.
- The current authorization flow can warn and continue without a complete per-account result; the agreed per-account and aggregate outcomes are not yet verified in the implementation.
- Automatic rollback requires authorization, safety and verification; otherwise report effects and reconciliation guidance. Current implementation coverage remains unverified.

**Errors**:

- `INPUT_INVALID`: The environment or account data violates input constraints -> generation is not reported as successful.
- `AUTHORIZATION_REQUEST_INCOMPLETE`: An individual account request cannot be created -> the account is reported as `failed`; the overall outcome is `partial` if other required work completed, otherwise `failed`.
- `ENVIRONMENT_SETUP_FAILED`: A setup action cannot complete -> the actor receives a failure; earlier side effects are not assumed to be rolled back.
- `AUTHORIZATION_PENDING`: A required account authorization is awaiting approval -> the account is `pending` and a configured environment remains `partial`.
- `AUTHORIZATION_STATUS_UNKNOWN`: A required account authorization cannot be verified -> the account is `unverifiable` and a configured environment remains `partial`.

**Acceptance checks**:

- `AC-01`: A valid qualified environment name is retained in full, and its final segment determines the lifecycle. Evidence: [environment tests](../../apps/cli/src/domain/__tests__/environment.test.ts).
- `AC-02`: A successful structured result includes resolved non-secret backend metadata and excludes credentials. Evidence: [environment output tests](../../apps/cli/src/adapters/commander/commands/__tests__/add-json.test.ts).
- `AC-03`: An invalid environment name produces `INPUT_INVALID` instead of a successful environment result. Evidence: [environment model](../../apps/cli/src/domain/environment.ts), [input validation](../../apps/cli/src/adapters/commander/commands/add.ts).
- `AC-04`: If an individual authorization request fails, the current flow emits a warning and does not include that failed request among created request links. Evidence: [authorization flow](../../apps/cli/src/adapters/commander/commands/add.ts).
- `AC-05`: If one required environment step succeeds and another remains incomplete, the result is `partial` and reports known and uncertain step outcomes or effects. Evidence: [agreed outcome policy](../design-review.md#solution-design); required-step mapping and implementation verification remain open.
- `AC-06`: If `ENVIRONMENT_SETUP_FAILED` and automatic rollback is not authorized, safe and verified, setup stops and reports known or uncertain effects and reconciliation guidance. Evidence: [agreed rollback policy](../design-review.md#solution-design); implementation verification remains in `open.item-007`.
- `AC-07`: Each selected account has exactly one of `not_required`, `pending`, `approved`, `failed` or `unverifiable`, and a failed request is distinguishable from a request that was not required. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.
- `AC-08`: Given a configured environment with a required account in `pending`, `failed` or `unverifiable`, the overall result is `partial` and does not claim `success`. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.
- `AC-09`: The overall result is `success` only when every required step has succeeded and each required account is verified as `approved` or `not_required`. Evidence: stakeholder decision in `uc-open-01`; implementation verification remains in parent `open.item-005`.

**Tracking events**:

- `audit_sensitive_operation` (proposed event identifier): when an environment action is designated sensitive, record actor, resource, time, outcome and applicable approvals without secrets. Channel: system; purpose: accountability; status: policy agreed, implementation and retention unverified. See `contracts.item-014` and parent `open.item-003`.
- Product analytics events are not inventoried; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Consumer as Developer or agent
      participant Setup as Environment setup
      participant Cloud as Cloud account and state
      participant Owner as Authorization owner
      Consumer->>Setup: Provide environment inputs
      Setup->>Cloud: Check and initialize required state
      Setup->>Owner: Request or verify authorization per account
      Owner-->>Setup: Request and approval status
      Setup-->>Consumer: Environment metadata, per-account and overall outcomes
  ```

- Service Blueprint: [SB-03 Prepare workspace and environment](../service-blueprint.md#sb-03-prepare-workspace-and-environment).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-002`, `solution.components.item-003`, `solution.components.item-004`, `solution.components.item-012`.
- Interface / data contract: `contracts.item-003`, `contracts.item-005`, `contracts.item-014`.
- Validation evidence: [environment tests](../../apps/cli/src/domain/__tests__/environment.test.ts), [output tests](../../apps/cli/src/adapters/commander/commands/__tests__/add-json.test.ts).

## Open questions and propagation

| ID           | Type     | Item                                                                                                                                                                                            | Impact / blocker                                                                                                 | Owner            | Resolution / link                                                                                                                                                            |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uc-open-01` | Decision | Report `not_required`, `pending`, `approved`, `failed` or `unverifiable` per account; a configured environment remains `partial` until every required authorization is approved or unnecessary. | The current warnings and returned links do not establish the agreed per-account result or approval verification. | DX Product Owner | Confirmed by the requesting stakeholder 2026-11-04; [authorization flow](../../apps/cli/src/adapters/commander/commands/add.ts); parent `open.item-005` and `open.item-007`. |
