# CED Adhesion pilot — proposed Jira backlog projection

> **Status: draft, not persisted.** This document is the `jira-magister`
> **backlog-mode** projection of the Design Review
> [`design-review.md`](./design-review.md), its linked PRD
> [`demo/prd.md`](../prd.md), and the Use Case child
> [`use-cases/uc-01-upload-signed-agreement.md`](./use-cases/uc-01-upload-signed-agreement.md).
> **No Jira issue was created, updated, or linked.** The request was to derive
> the backlog items without creating them in Jira.
>
> Before any mutation this projection needs (a) explicit human confirmation and
> (b) a Jira project key / board, which was not supplied. Per `jira-magister`
> rules, a project key is required and must not be guessed.

## 1. Source of truth and entry mode

| Item                | Value                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Entry mode          | Backlog mode (full projection from a source of truth)                                        |
| DR/SRS              | `design-review.md`, `metadata.status: draft`, `metadata.canonical-outcome-id: CED-ADHESION`  |
| PRD                 | `demo/prd.md` (sponsor Disability Department, owner Product IO)                              |
| Use Case            | `UC-01` — Upload signed agreement (step 1), child status `ready` (proposed, see §3)           |
| JTBD                | `JTBD-01`                                                                                    |
| KPI                 | > 80% of demo uploads completed without tickets (PRD BG-01)                                   |
| Guardrail           | CAdES-only is hypothesized; PII must never appear in logs                                    |
| Repository          | **Missing** (`references.repository` = N/A — greenfield, `open.item-005`)                     |
| Jira project / board| **Not supplied** — required before any mutation                                              |

The DR/SRS remains the operational source of truth. Accepted decisions are not
propagated through a separate RFC here: no RFC exists for this initiative.

## 2. Definition of Ready assessment

| DoR check                                     | Result                                                         | Consequence for this projection |
| --------------------------------------------- | ------------------------------------------------------------- | ------------------------------- |
| PRD owner, outcome, JTBD, KPI, guardrail      | Present; sponsor TBD                                          | Pass with a visible gap          |
| Complete required DR sections                 | `Always` sections present; gaps carry owners                   | Pass with declared gaps          |
| Stable Use Case ID + binary acceptance checks | `UC-01`, `AC-01`..`AC-03` on `Must`                            | Pass                             |
| Priority / lifecycle context                  | `priority: Must`, child status `ready` (proposed)              | Pass, pending human confirmation |
| Design / blueprint links                      | No Figma or Service Blueprint link (`references.figma`, `references.service-blueprint`) | Gap recorded (non-blocking for drafting) |
| API / event / data contracts                  | `openapi.yaml` linked; data + audit contracts are gaps          | Pass with declared gaps          |
| Privacy / security / accessibility / support  | All recorded as gaps with owners (`open.item-007`, NFR-04/08, `open.item-009`) | Production-launch blockers only  |
| RFC propagation                               | N/A — no RFC                                                   | Pass                             |

**Result:** the projection can be drafted, but it carries blockers and gaps that
must stay visible. The following items are **not** Definition-of-Ready blockers
by themselves (they become spikes or recorded gaps), and no missing value is
invented to make an item appear ready.

## 3. Readiness promotions pending human confirmation

| Item            | Proposed state | Evidence                                                                                          | Confirmed by |
| --------------- | -------------- | ------------------------------------------------------------------------------------------------- | ------------ |
| `UC-01` child   | `ready`        | Trigger, main flow, `AC-01`..`AC-03` on `Must`, priority, components `solution.components.item-001/003/004/005`, contract `contracts.item-001`, domain entities, typed errors | **Pending human review** |
| `metadata.status` (DR) | stays `draft` | Document review gate not passed (sponsor, classification, repository gaps)                | Not proposed |

The backlog below consumes `UC-01` as a `ready` child **on the assumption the
reviewer confirms it**. The document review gate is not required for handoff.

## 4. Proposed Epic slices (approval required before drafting final items)

Two cohesive outcomes are proposed. Approve, merge, or re-cut them before final
Stories and Tasks are frozen.

| Epic     | Proposed summary                                             | Included UC / JTBD      | KPI outcome / guardrail                                   | Exclusions                                                     | Dependencies / readiness gaps                                                        | Delivery risk |
| -------- | ------------------------------------------------------------ | ----------------------- | -------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------- |
| `EPIC-01` | CED Adhesion pilot — signed agreement upload                  | `UC-01`, `JTBD-01`      | > 80% demo uploads without tickets; PII never in logs     | Practice creation, back-office review, notifications, production launch | Agreement template (`open.item-001`), signature format (`open.item-002`), auth (`open.item-004`), repository (`open.item-005`), size limit (`open.item-010`) | High — several blocking decisions |
| `EPIC-02` | CED Adhesion pilot — foundational decisions, trust, and ops   | Enabling for `UC-01`    | Pilot can be operated safely and reproducibly             | Product feature scope beyond enabling work                     | Repository (`open.item-005`), data classification (`open.item-007`), runbook (`open.item-009`) | Medium — mostly enabling work |

`EPIC-01` is the actor-visible capability. `EPIC-02` is the enabling,
decision-making, and operational slice. Neither is meant to span the whole
initiative.

## 5. Proposed Stories (actor-facing, one two-week sprint each)

### `STORY-01` — Upload a valid signed agreement

- **Epic**: `EPIC-01`
- **Summary**: As a Partner Entity, I want to upload a signed agreement, so that I can join CED without opening a manual ticket.
- **Source**: `Source: DR design-review.md | JTBD-01 | UC-01 | AC-01`
- **Acceptance checks** (from UC-01, IDs preserved):
  - `AC-01` — Given a Practice in `REQUEST` and a valid signed agreement within the pilot size limit, when the Partner Entity submits the upload, then the Practice becomes `PENDING` and the response returns a `documentId` and `status = PENDING`.
  - `AC-03` — Given a Practice that already has a valid `signingStep = 1` Document, when the Partner Entity submits another step-1 upload, then the API returns `409` with `PRACTICE_STATE_INVALID` and the existing document is not overwritten. (Alternate flow `A1`.)
- **Fits one sprint**: Yes
- **Readiness gaps**: blocked by `SPIKE-TEMPLATE`, `SPIKE-AUTH`, `SPIKE-REPO`, `SPIKE-SIZE`; no repository to route to.

### `STORY-02` — Get a clear error when the upload is invalid

- **Epic**: `EPIC-01`
- **Summary**: As a Partner Entity, I want to be told clearly why my upload was rejected, so that I can correct the file and retry.
- **Source**: `Source: DR design-review.md | JTBD-01 | UC-01 | AC-02`
- **Acceptance checks** (from UC-01, IDs preserved):
  - `AC-02` — Given a Practice in `REQUEST` and a file that fails extension or signature validation, when the Partner Entity submits the upload, then the API returns the corresponding typed error (`AGREEMENT_EXTENSION_INVALID` or `AGREEMENT_SIGNATURE_INVALID`) and the Practice state and stored documents are unchanged.
- **Fits one sprint**: Yes
- **Readiness gaps**: blocked by `SPIKE-FORMAT`, `SPIKE-LIB`, `SPIKE-REPO`, `SPIKE-SIZE`; error identifiers must be honoured exactly.

## 6. Proposed technical Tasks (enabling work, one sprint each)

### Under `EPIC-01`

| Task         | Summary                                                                                 | Source / traceability                                        | Blocked by            |
| ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------- |
| `TASK-01`    | Implement the Practice state transition `REQUEST` → `PENDING` with the step-1 invariant | `UC-01` flow 5; `solution.components.item-003`               | `SPIKE-TEMPLATE`      |
| `TASK-02`    | Persist confidential agreement blobs in Azure Storage Account with encryption in transit/at rest | `UC-01` flow 4; `solution.components.item-004`; NFR-04        | `SPIKE-CLASSIFICATION`|
| `TASK-03`    | Author the OpenAPI v3 contract for upload and status and wire it to the implementation  | `contracts.item-001`; [`openapi.yaml`](./openapi.yaml)       | `SPIKE-AUTH`, `SPIKE-TEMPLATE` |
| `TASK-04`    | Implement the upload endpoint (`uploadSignedAgreement`) against the contract            | `UC-01` main flow; `solution.components.item-001`            | `TASK-03`             |
| `TASK-05`    | Implement the status read endpoint (`getPractice`) used by the UI confirmation          | `UC-01` flow 7; `contracts.item-001`                         | `TASK-03`             |
| `TASK-06`    | Instrument the upload flow with logs, metrics, and traces (no PII)                       | NFR-04, NFR-07; `solution.components.item-005`               | `SPIKE-REPO`          |
| `TASK-ERR-EXT` | Handle `AGREEMENT_EXTENSION_INVALID` with no blob written and no state change          | `UC-01` E1; semantic error identifier                        | `SPIKE-FORMAT`        |
| `TASK-ERR-SIG` | Handle `AGREEMENT_SIGNATURE_INVALID` with no blob written and no state change          | `UC-01` E2; semantic error identifier                        | `SPIKE-FORMAT`, `SPIKE-LIB` |
| `TASK-ERR-STATE` | Handle `PRACTICE_STATE_INVALID` (not in `REQUEST`, or duplicate step 1) with `409`    | `UC-01` E3, A1; semantic error identifier                    | `SPIKE-TEMPLATE`      |
| `TASK-ERR-SIZE` | Handle `AGREEMENT_FILE_TOO_LARGE` against the confirmed pilot limit                     | `UC-01` E4; semantic error identifier                         | `SPIKE-SIZE`          |

Error handling is defined **once per semantic identifier**, not once per Use
Case. `UC-01` is currently the only Use Case, so each identifier maps to exactly
one Task; `TASK-ERR-SIG` and `TASK-ERR-STATE` are the ones most likely to be
shared if later Use Cases reuse the same conditions.

### Under `EPIC-02`

| Task         | Summary                                                                                       | Source / traceability                                     | Blocked by            |
| ------------ | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------- |
| `TASK-07`    | Bootstrap the greenfield repository and TypeScript project skeleton                           | PRD RF-03; DR `references.repository`                     | `SPIKE-REPO`          |
| `TASK-08`    | Provision the Azure baseline (Container Apps, PostgreSQL Flexible Server, Storage Account, Key Vault) | `solution.deployment.item-001`; `tech.profile.item-003/006/007/008` | `SPIKE-REPO`  |
| `TASK-09`    | Establish the security baseline: Managed Identity, Key Vault, and private endpoints           | NFR-04; `solution.deployment.item-004`                    | `TASK-08`             |
| `TASK-10`    | Deploy the observability baseline (Application Insights + @pagopa/azure-tracing)              | NFR-07; `tech.profile.item-009`                           | `TASK-08`             |
| `TASK-11`    | Author the pilot runbook and support readiness path                                           | `open.item-009` (non-blocking gap)                        | —                     |

## 7. Proposed spike Tasks from blocking open questions

Each `Blocking: yes` question in the DR becomes an independent spike whose
deliverable is a decision. The dependent items `are blocked by` the spike.
Non-blocking questions create no spike and no edge (see §9).

| Spike          | Decision to take                                              | Source         | Owner                    | Blocks (dependent items)                                  |
| -------------- | ------------------------------------------------------------- | -------------- | ------------------------ | --------------------------------------------------------- |
| `SPIKE-TEMPLATE` | Which agreement template and version governs the upload?    | `open.item-001`| Product with BO          | `STORY-01`, `TASK-01`, `TASK-03`, `TASK-04`               |
| `SPIKE-FORMAT` | Which signature formats are allowed (CAdES only or others)?   | `open.item-002`| Product with Legal       | `STORY-02`, `TASK-ERR-SIG`, `TASK-04`                     |
| `SPIKE-AUTH`   | Is entity authentication required in the pilot, and how?      | `open.item-004`| Product with Engineering | `STORY-01`, `TASK-03`, `TASK-04`                          |
| `SPIKE-REPO`   | Where is the greenfield repository hosted and how is it bootstrapped? | `open.item-005` | Engineering       | `TASK-07`, `TASK-08`, and every unroutable Task in §8      |
| `SPIKE-LIB`    | Which CAdES verification library or service is used?          | `open.item-006`| Engineering              | `TASK-ERR-SIG`                                            |
| `SPIKE-CLASSIFICATION` | What are the classification, retention, and deletion rules for agreement documents? | `open.item-007` | Product with Legal/DPO | `TASK-02`, production launch |
| `SPIKE-SIZE`   | What is the maximum upload size for the pilot?                | `open.item-010`| Product with Engineering | `TASK-ERR-SIZE`, `TASK-03`                                |

## 8. Repository routing

`references.repository` is **N/A — no repository exists** (greenfield,
`open.item-005`). Per `jira-magister`, concrete Tasks are **not** routed to a
guessed repository. Until `SPIKE-REPO` resolves, every concrete Task
(`TASK-01`..`TASK-11`) is flagged **unroutable**. No owner, branch, or repository
was invented.

## 9. Non-blocking gaps (recorded, no spike, no blocking edge)

| Gap            | Item                                                            | Owner                | Effect                                                     |
| -------------- | --------------------------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| `open.item-003`| Exact actor role: representative or delegate                     | Product              | Affects Story wording and authorization; no edge          |
| `open.item-008`| Tracking / analytics event taxonomy not defined                  | Product              | No pilot analytics; recorded on `UC-01` tracking section  |
| `open.item-009`| Support readiness and runbook do not exist                       | Engineering          | Tracked as `TASK-11`; no blocking edge                    |
| `open.item-011`| Practice is assumed to exist in `REQUEST` before upload          | Product              | Scopes `UC-01`; no edge                                   |
| `open.item-012`| No Figma frame or Service Blueprint link for the upload flow     | Product              | No design evidence for UX/accessibility; no edge          |

## 10. Dependency link list (blocking -> blocked -> link type)

```text
SPIKE-TEMPLATE -> STORY-01          -> blocks
SPIKE-TEMPLATE -> TASK-01           -> blocks
SPIKE-TEMPLATE -> TASK-03           -> blocks
SPIKE-TEMPLATE -> TASK-04           -> blocks
SPIKE-FORMAT   -> STORY-02          -> blocks
SPIKE-FORMAT   -> TASK-ERR-SIG      -> blocks
SPIKE-FORMAT   -> TASK-04           -> blocks
SPIKE-AUTH     -> STORY-01          -> blocks
SPIKE-AUTH     -> TASK-03           -> blocks
SPIKE-AUTH     -> TASK-04           -> blocks
SPIKE-REPO     -> TASK-07           -> blocks
SPIKE-REPO     -> TASK-08           -> blocks
SPIKE-LIB      -> TASK-ERR-SIG      -> blocks
SPIKE-CLASSIFICATION -> TASK-02     -> blocks
SPIKE-SIZE     -> TASK-ERR-SIZE     -> blocks
SPIKE-SIZE     -> TASK-03           -> blocks
TASK-03        -> TASK-04           -> blocks
TASK-03        -> TASK-05           -> blocks
TASK-08        -> TASK-09           -> blocks
TASK-08        -> TASK-10           -> blocks
```

Epic membership uses the Epic parent relationship, **not** `blocks`. Sub-tasks
were not proposed; no implementation step is tightly coupled enough to need one
at this granularity.

## 11. Proposed Epic/Story/Task hierarchy

```text
EPIC-01  CED Adhesion pilot — signed agreement upload
├── STORY-01  Upload a valid signed agreement            (AC-01, AC-03)
├── STORY-02  Get a clear error when the upload is invalid (AC-02)
├── TASK-01   Practice state transition REQUEST -> PENDING
├── TASK-02   Confidential agreement blob storage
├── TASK-03   OpenAPI v3 contract authoring + wiring
├── TASK-04   Upload endpoint (uploadSignedAgreement)
├── TASK-05   Status endpoint (getPractice)
├── TASK-06   Upload telemetry (no PII)
├── TASK-ERR-EXT   AGREEMENT_EXTENSION_INVALID
├── TASK-ERR-SIG   AGREEMENT_SIGNATURE_INVALID
├── TASK-ERR-STATE PRACTICE_STATE_INVALID
└── TASK-ERR-SIZE  AGREEMENT_FILE_TOO_LARGE

EPIC-02  CED Adhesion pilot — foundational decisions, trust, and ops
├── TASK-07   Repository bootstrap
├── TASK-08   Azure baseline provisioning
├── TASK-09   Security baseline (Managed Identity, Key Vault, private endpoints)
├── TASK-10   Observability baseline
├── TASK-11   Runbook and support readiness
├── SPIKE-TEMPLATE        (blocks STORY-01, TASK-01/03/04)
├── SPIKE-FORMAT          (blocks STORY-02, TASK-ERR-SIG, TASK-04)
├── SPIKE-AUTH            (blocks STORY-01, TASK-03/04)
├── SPIKE-REPO            (blocks TASK-07/08 and all routing)
├── SPIKE-LIB             (blocks TASK-ERR-SIG)
├── SPIKE-CLASSIFICATION  (blocks TASK-02, production launch)
└── SPIKE-SIZE            (blocks TASK-ERR-SIZE, TASK-03)
```

## 12. Proposed operations and confirmation

- **Operation**: create `EPIC-01`, `EPIC-02`; create Stories `STORY-01`..`STORY-02`; create Tasks `TASK-01`..`TASK-11` and `TASK-ERR-*`; create spikes `SPIKE-*`; create the `blocks` links in §10.
- **Item count**: 2 Epics, 2 Stories, 11 Tasks, 4 error-handling Tasks, 7 spikes, 20 dependency links.
- **Project key / board**: **not supplied** — cannot be inferred.
- **Unresolved gaps**: repository routing (`open.item-005`), data classification (`open.item-007`), plus the non-blocking gaps in §9.
- **Confirmation**: this is a *draft*. A request to "prepare", "draft", or "show" is not confirmation. No Jira mutation was performed. On explicit confirmation, and once a project key is provided, follow `jira-magister` persistence: match existing issues by stable IDs before creating, create parents before children, create spikes before blocked items, add `blocks` links only after both ends exist, then re-fetch and verify every item and link.
