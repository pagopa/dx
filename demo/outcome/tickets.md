# CED Adhesion pilot - proposed Jira backlog projection

> **Framework test artifact; draft, not persisted.** No Jira issue was
> created, updated, or linked. Confirmation, persistence and post-mutation
> verification remain pending. The demo files model the framework's current
> behavior, not a production initiative.

## Context and readiness

- Entry mode: backlog projection from the DR, PRD and UC-01.
- Jira project, board and labels: not supplied. Issue identifiers below are
  draft-local references, not Jira keys; issue types and links require
  confirmation against the target project's schema.
- Proposed operation: create the draft items below after grouping and readiness
  are confirmed and existing issues have been matched; no Jira matching has
  been performed.
- Outcome: more than 80% of demo uploads complete without manual tickets.
- Guardrail: no PII in logs; CAdES-only remains a hypothesis.
- DR status stays `draft`. The UC-01 `ready` promotion is proposed, not
  human-confirmed. Its AC-01, AC-02 and AC-03 are preserved below.
- Missing application repository (`open.item-005`): every concrete Task remains
  **unroutable**. `pagopa/dx` below hosts the test documents; it is not the
  application's repository.
- Figma and Blueprint locators are missing (Product, `open.item-012`); do not
  invent them. Classification and privacy (`open.item-007`, Product with
  Legal/DPO), accessibility (Product / Design) and support readiness
  (`open.item-009`, Engineering) remain gaps before launch.
- Non-blocking questions stay gaps with their recorded owners: actor role
  (`open.item-003`, Product), tracking (`open.item-008`, Product), support
  readiness (`open.item-009`, Engineering), Practice bootstrap
  (`open.item-011`, Product), and design/blueprint
  (`open.item-012`, Product). They create no question-derived spike or edge.
- The Epic grouping, task scope and proposed dependencies require human
  approval. UC-01's `uc-open-01` leaves the duplicate-upload decision
  unresolved; the `409` behavior and AC-03 are proposals, not an accepted
  decision.

Each issue below has its own body sections. The top-level bullets in its
`Source` are its document inventory, not a second list. Repository sources use
full blob URLs with no fabricated fragments; nested IDs remain code text.

# EPIC-01 - CED Adhesion pilot: signed agreement upload

## Source

- prd: [PRD - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/prd.md)
  - `JTBD-01` - Join CED without manual tickets
- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)

## Description

Actor-visible upload capability, bounded to a few two-week sprints. Includes
STORY-01/02, TASK-01..06 and TASK-ERR-*. Excludes Practice creation,
back-office review, notifications and production launch. KPI: more than 80%
of demo uploads without tickets; PII never in logs.

High delivery risk: template, signature format, authentication, repository and
size-limit decisions are unresolved. Approve this grouping before final items.

# EPIC-02 - CED Adhesion pilot: foundational decisions, trust and operations

## Source

- prd: [PRD - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/prd.md)
  - `JTBD-01` - Join CED without manual tickets
- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)

## Description

Enabling outcome: operate the pilot safely and reproducibly. Includes
TASK-07..11 and the independent decision spikes below. Bounded to a few
two-week sprints; excludes product features beyond enabling work.
KPI/guardrail: support the demo upload outcome without PII in logs.
Medium delivery risk, with repository, classification and runbook gaps.
Approve this grouping before final items.

# STORY-01 - As a Partner Entity, I want to upload a signed agreement, so that I can join CED without opening a manual ticket

## Source

- prd: [PRD - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/prd.md)
  - `JTBD-01` - Join CED without manual tickets
- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `contracts.item-001` - Upload and status API
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)
  - `PRACTICE_STATE_INVALID`
  - `uc-open-01` - Duplicate-upload behavior
- contract: [Upload and status OpenAPI](https://github.com/pagopa/dx/blob/main/demo/outcome/openapi.yaml)

## Description

- Parent: EPIC-01.
- Summary: As a Partner Entity, I want to upload a signed agreement, so that I
  can join CED without opening a manual ticket.
- Fits one sprint. Blocked by SPIKE-TEMPLATE, SPIKE-AUTH, SPIKE-REPO and
  SPIKE-SIZE; no application repository to route to.
- Acceptance checks copied from UC-01, IDs preserved:
  - `AC-01`: Given a Practice in `REQUEST` and a valid signed agreement within
    the pilot size limit, when the Partner Entity submits the upload, then the
    Practice becomes `PENDING` and the response returns a `documentId` and
    `status = PENDING`.
  - `AC-03`: Given a Practice that already has a valid `signingStep = 1`
    Document, when the Partner Entity submits another step-1 upload, then the
    API returns `409` with `PRACTICE_STATE_INVALID` and the existing document
    is not overwritten. The alternate-flow behavior remains proposed in the UC.

## AC Coverage

- [AC-01](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)
- [AC-03](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)

# STORY-02 - As a Partner Entity, I want to be told clearly why my upload was rejected, so that I can correct the file and retry

## Source

- prd: [PRD - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/prd.md)
  - `JTBD-01` - Join CED without manual tickets
- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `contracts.item-001` - Upload and status API
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)
  - `AGREEMENT_EXTENSION_INVALID`
  - `AGREEMENT_SIGNATURE_INVALID`
- contract: [Upload and status OpenAPI](https://github.com/pagopa/dx/blob/main/demo/outcome/openapi.yaml)

## Description

- Parent: EPIC-01.
- Summary: As a Partner Entity, I want to be told clearly why my upload was
  rejected, so that I can correct the file and retry.
- Fits one sprint. Blocked by SPIKE-FORMAT, SPIKE-LIB, SPIKE-REPO and
  SPIKE-SIZE; error identifiers must be honored exactly.
- Acceptance check from UC-01:
  - `AC-02`: Given a Practice in `REQUEST` and a file that fails extension or
    signature validation, when the Partner Entity submits the upload, then
    the API returns the corresponding typed error (`AGREEMENT_EXTENSION_INVALID`
    or `AGREEMENT_SIGNATURE_INVALID`) and the Practice state and stored
    documents are unchanged.

## AC Coverage

- [AC-02](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)

# TASK-01 - Implement the Practice REQUEST to PENDING transition

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `solution.components.item-003` - Practice registry
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)

## Description

Parent EPIC-01; one-sprint enabling work for UC-01 main-flow step 5 and the
step-1 invariant. Blocked by SPIKE-TEMPLATE. Unroutable until SPIKE-REPO resolves.
Verification: exercise the proposed `REQUEST` to `PENDING` transition and
duplicate step-1 behavior against the confirmed decision.

# TASK-02 - Persist confidential agreement blobs

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `solution.components.item-004` - Agreement storage
  - `NFR-04` - Security
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)

## Description

Parent EPIC-01; one-sprint enabling work for UC-01 step 4, encrypted in transit
and at rest. Blocked by SPIKE-CLASSIFICATION. Unroutable until SPIKE-REPO resolves.
Verification: confirm confidential blob persistence and transport/at-rest
encryption; the security review remains pending.

# TASK-03 - Author and wire the upload/status OpenAPI contract

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `contracts.item-001` - Upload and status API
- contract: [Upload and status OpenAPI](https://github.com/pagopa/dx/blob/main/demo/outcome/openapi.yaml)

## Description

Parent EPIC-01; one-sprint contract-only work. No reverse lookup of UCs is
needed. Blocked by SPIKE-AUTH, SPIKE-TEMPLATE and SPIKE-SIZE.
Unroutable until SPIKE-REPO resolves.
Verification: lint the OpenAPI contract and test it against the implemented API.

# TASK-04 - Implement uploadSignedAgreement

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `solution.components.item-001` - Agreement processing
  - `contracts.item-001` - Upload and status API
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)
- contract: [Upload and status OpenAPI](https://github.com/pagopa/dx/blob/main/demo/outcome/openapi.yaml)

## Description

Parent EPIC-01; one-sprint upload endpoint against the contract. Blocked by
TASK-03, SPIKE-TEMPLATE, SPIKE-FORMAT and SPIKE-AUTH.
Unroutable until SPIKE-REPO resolves.
Verification: exercise the upload endpoint against the contract and the
confirmed validation decisions.

# TASK-05 - Implement getPractice

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `contracts.item-001` - Upload and status API
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)
- contract: [Upload and status OpenAPI](https://github.com/pagopa/dx/blob/main/demo/outcome/openapi.yaml)

## Description

Parent EPIC-01; one-sprint status endpoint for UC-01 step 7 confirmation.
Blocked by TASK-03. Unroutable until SPIKE-REPO resolves.
Verification: test the status response against the contract for the proposed
`PENDING` practice.

# TASK-06 - Instrument the upload flow without PII

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `NFR-04` - Security
  - `NFR-07` - Observability
  - `solution.components.item-005` - Telemetry

## Description

Parent EPIC-01; one-sprint logs, metrics and traces work. Blocked by SPIKE-REPO
and unroutable until it resolves.
Verification: inspect emitted telemetry and scan logs for PII.

# TASK-ERR-EXT - Handle AGREEMENT_EXTENSION_INVALID

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `contracts.item-001` - Upload and status API
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)
  - `AGREEMENT_EXTENSION_INVALID`
- contract: [Upload and status OpenAPI](https://github.com/pagopa/dx/blob/main/demo/outcome/openapi.yaml)

## Description

Parent EPIC-01; one-sprint enabling work for STORY-02: no blob written and no
state change on a disallowed extension (E1). Blocked by SPIKE-FORMAT.
Unroutable until SPIKE-REPO resolves.
Verification: a negative test checks the typed error and unchanged practice
and stored documents.

# TASK-ERR-SIG - Handle AGREEMENT_SIGNATURE_INVALID

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `contracts.item-001` - Upload and status API
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)
  - `AGREEMENT_SIGNATURE_INVALID`
- contract: [Upload and status OpenAPI](https://github.com/pagopa/dx/blob/main/demo/outcome/openapi.yaml)

## Description

Parent EPIC-01; one-sprint enabling work for STORY-02: no blob written and no
state change on invalid signature/digest (E2). Blocked by SPIKE-FORMAT and
SPIKE-LIB. Unroutable until SPIKE-REPO resolves.
Keep one Task for this semantic error if future UCs reuse it.
Verification: negative signature and digest tests check the typed error and
unchanged practice and stored documents.

# TASK-ERR-STATE - Handle PRACTICE_STATE_INVALID

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `contracts.item-001` - Upload and status API
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)
  - `PRACTICE_STATE_INVALID`
  - `uc-open-01` - Duplicate-upload behavior
- contract: [Upload and status OpenAPI](https://github.com/pagopa/dx/blob/main/demo/outcome/openapi.yaml)

## Description

Parent EPIC-01; one-sprint enabling work for STORY-01: return 409 without a
write when not in REQUEST; duplicate step-1 handling remains proposed pending
`uc-open-01` (E3/A1). Blocked by SPIKE-TEMPLATE. Unroutable until SPIKE-REPO
resolves. Verification: test invalid-state behavior and the duplicate behavior
once confirmed.

# TASK-ERR-SIZE - Handle AGREEMENT_FILE_TOO_LARGE

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `contracts.item-001` - Upload and status API
- uc: [UC-01 - Upload signed agreement](https://github.com/pagopa/dx/blob/main/demo/outcome/use-cases/uc-01-upload-signed-agreement.md)
  - `AGREEMENT_FILE_TOO_LARGE`
- contract: [Upload and status OpenAPI](https://github.com/pagopa/dx/blob/main/demo/outcome/openapi.yaml)

## Description

Parent EPIC-01; one-sprint typed size rejection against the confirmed limit
(E4). Blocked by SPIKE-SIZE. Unroutable until SPIKE-REPO resolves.
Verification: test an upload exceeding the confirmed limit and check the typed
error, unchanged practice and absence of a new blob.

# TASK-07 - Bootstrap the greenfield repository

## Source

- prd: [PRD - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/prd.md)
  - `RF-03` - Greenfield repository and contract
- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `references.repository` - Missing application repository

## Description

Parent EPIC-02; one-sprint TypeScript project skeleton.
Blocked by SPIKE-REPO and unroutable until it resolves.
Verification: confirm the skeleton exists in the agreed application repository.

# TASK-08 - Provision the Azure baseline

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `solution.deployment.item-001` - Non-production environment
  - `tech.profile.item-003` - Container runtime
  - `tech.profile.item-006` - Agreement storage
  - `tech.profile.item-007` - Practice persistence
  - `tech.profile.item-008` - Secrets

## Description

Parent EPIC-02; one-sprint proposed Container Apps, PostgreSQL, Storage Account
and Key Vault baseline. Blocked by SPIKE-REPO and unroutable until it resolves.
Verification: inspect the proposed non-production resources and record deployment
evidence after the repository and deployment configuration are agreed.

# TASK-09 - Establish the security baseline

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `NFR-04` - Security
  - `solution.deployment.item-004` - Internal trust boundary

## Description

Parent EPIC-02; one-sprint Managed Identity, Key Vault and private-endpoint
work. Blocked by TASK-08. Unroutable until SPIKE-REPO resolves.
Verification: inspect identity, secrets and the proposed private connectivity;
the security review remains pending.

# TASK-10 - Deploy the observability baseline

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `NFR-07` - Observability
  - `tech.profile.item-009` - Application Insights and azure-tracing

## Description

Parent EPIC-02; one-sprint telemetry baseline. Blocked by TASK-08.
Unroutable until SPIKE-REPO resolves.
Verification: confirm logs, metrics, traces and the proposed 5xx alert reach
Application Insights.

# TASK-11 - Author the pilot runbook and support readiness path

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `validation.operations` - Operational readiness
  - `open.item-009` - Missing runbook, non-blocking for drafting

## Description

Parent EPIC-02; existing one-sprint operational-readiness Task, not a
question-derived spike. No blocking edge is added for open.item-009.
Unroutable until SPIKE-REPO resolves.
Verification: review the runbook and validate the alert; support readiness
remains a gap until confirmed by Engineering.

# SPIKE-TEMPLATE - Decide the agreement template and version

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `open.item-001` - Agreement template

## Description

Parent EPIC-02; one-sprint decision owned by Product with BO.
Outcome: confirmed template/version. Blocks STORY-01 and TASK-01/03/04.
No decision has been invented.

# SPIKE-FORMAT - Decide the allowed signature formats

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `open.item-002` - Allowed signature formats

## Description

Parent EPIC-02; one-sprint decision owned by Product with Legal.
Outcome: confirmed CAdES-only or other allowed formats.
Blocks STORY-02, TASK-ERR-EXT, TASK-ERR-SIG and TASK-04.

# SPIKE-AUTH - Decide pilot entity authentication

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `open.item-004` - Pilot authentication

## Description

Parent EPIC-02; one-sprint decision owned by Product with Engineering.
Outcome: confirmed authentication requirement and approach.
Blocks STORY-01 and TASK-03/04.

# SPIKE-REPO - Decide the application repository and bootstrap

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `open.item-005` - Application repository

## Description

Parent EPIC-02; one-sprint decision owned by Engineering.
Outcome: confirmed application repository for routing.
Blocks STORY-01/02 and routing of all concrete Tasks; the document-hosting
repository above does not resolve this gap.

# SPIKE-LIB - Select a CAdES verification library or service

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `open.item-006` - Signature verification capability

## Description

Parent EPIC-02; one-sprint decision owned by Engineering.
Outcome: confirmed library or service. Blocks STORY-02 and TASK-ERR-SIG.

# SPIKE-CLASSIFICATION - Decide agreement data handling

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `open.item-007` - Classification, retention and deletion

## Description

Parent EPIC-02; one-sprint decision owned by Product with Legal/DPO.
Outcome: confirmed data-handling rules. Blocks TASK-02 and production launch.

# SPIKE-SIZE - Decide the pilot upload limit

## Source

- dr: [Design Review - CED Adhesion](https://github.com/pagopa/dx/blob/main/demo/outcome/design-review.md)
  - `open.item-010` - Maximum upload size

## Description

Parent EPIC-02; one-sprint decision owned by Product with Engineering.
Outcome: confirmed size limit. Blocks STORY-01/02, TASK-ERR-SIZE and TASK-03.

# Confirmation and persistence

- Proposed creation: 2 Epics, 2 Stories, 11 enabling Tasks, 4 error Tasks and
  7 spikes. None has been persisted.
- Preserve the parent hierarchy above; Epic membership is not a `blocks` link.
  No Sub-tasks are proposed at this granularity.
- Preserve each explicit dependency direction above (blocker -> dependent).
  TASK-03 additionally blocks TASK-04/05; TASK-08 blocks TASK-09/10.
- Before mutation: confirm grouping, descriptions, source blocks, dependencies,
  project/board and readiness gaps. Match existing issues before creation.
- These are repository-file sources, so no Confluence/Figma native remote link
  can be proposed until any missing Figma locator is supplied. Re-fetch and
  verify any persisted projection; report failures.
