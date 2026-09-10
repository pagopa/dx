# Design Review / Software Requirements Specification — _<initiative title>_

> Section labels: `Always` is required in every DR/SRS; `If applicable` is
> populated when the topic exists, otherwise marked `N/A — <confirmed reason>`;
> `Optional` is included only when it adds value. Stable IDs and section anchors
> stay unchanged regardless of label or translation.
>
> **Minimum for backlog handoff** — a backlog agent can consume a DR/SRS with
> declared gaps when these are real: `Expected outcome` (outcome and scope),
> system context, the relevant NFRs, and a Use Case catalog listing the child
> pages, where each `ready` child carries a priority, a binary acceptance check,
> and its component and contract references. `metadata.status: review` is not
> required for handoff.

<!-- id: metadata -->

## Header and references — `Always`

| ID                              | Value                                                       |
| ------------------------------- | ----------------------------------------------------------- |
| `metadata.status`               | draft                                                       |
| `metadata.title`                | _<initiative title>_                                        |
| `metadata.canonical-outcome-id` | _<stable initiative outcome ID, e.g. CED-ONBOARD>_          |
| `metadata.source-id`            | _<stable DR source ID, e.g. doc-123456 or repository path>_ |
| `metadata.owner`                | _<DR/SRS owner>_                                            |
| `metadata.authors`              | _<authors or TBD>_                                          |
| `metadata.last-updated`         | _<YYYY-MM-DD>_                                              |
| `metadata.version`              | _<document version>_                                        |

### Related artifacts — `Always`

| ID                             | Artifact                                    | Link or reference                      | Relationship / status              |
| ------------------------------ | ------------------------------------------- | -------------------------------------- | ---------------------------------- |
| `references.prd`               | PRD                                         | _<link or N/A — direct DR/SRS intake>_ | _<source and status>_              |
| `references.rfc`               | RFCs                                        | _<links or N/A — reason>_              | _<propagated / historical / open>_ |
| `references.service-blueprint` | Service Blueprint                           | _<link or N/A — reason>_               | _<relevant journey>_               |
| `references.figma`             | Figma / design discovery                    | _<link or N/A — reason>_               | _<relevant flow>_                  |
| `references.contracts`         | OpenAPI / AsyncAPI / Data Contract          | _<links or N/A — reason>_              | _<affected contracts>_             |
| `references.reviews`           | Security / Privacy / Legal reviews          | _<links or N/A — reason>_              | _<status>_                         |
| `references.dpia`              | DPIA / privacy review                       | _<link or N/A — reason>_               | _<status>_                         |
| `references.launch-review`     | Launch Readiness Review (separate Go/No-Go) | _<link or N/A — reason>_               | _<linked, not duplicated>_         |
| `references.glossary`          | Project glossary                            | _<link or N/A — reason>_               | _<namespace and terminology>_      |
| `references.operations`        | Jira board / runbook / readiness artifacts  | _<links or N/A — reason>_              | _<status>_                         |

<!-- id: expected-outcome -->

## Expected outcome of the initiative — `Always`

_Summarize the context, intended outcome, scope, non-goals, and linked PRD
objectives. Keep product outcomes concise; do not duplicate the PRD. When there
is no PRD, this section is the home of the initiative outcome and scope._

| ID                    | Item                 | Description             | Source / status |
| --------------------- | -------------------- | ----------------------- | --------------- |
| `outcome.context`     | Context and problem  | _<confirmed context>_   | _<source>_      |
| `outcome.objective`   | Expected outcome     | _<measurable outcome>_  | _<source>_      |
| `outcome.scope`       | In scope             | _<confirmed boundary>_  | _<source>_      |
| `outcome.non-goals`   | Out of scope         | _<confirmed non-goals>_ | _<source>_      |
| `outcome.constraints` | Relevant constraints | _<constraints>_         | _<source>_      |

<!-- id: solution-design -->

## Solution design — `Always`

### Technology profile and constraints — `Always`

_Describe the preferred technology profile (CSP, programming language, runtime
platforms), explicit constraints, the Technology Radar outcome, and any
decisions or derogations. Mark unknown values as open questions._

| ID                      | Topic                         | Preference / constraint | Technology Radar outcome       | Decision / derogation | Owner / status |
| ----------------------- | ----------------------------- | ----------------------- | ------------------------------ | --------------------- | -------------- |
| `tech.profile.item-001` | _<CSP / language / platform>_ | _<preference>_          | _<adopt / trial / hold / gap>_ | _<decision>_          | _<owner>_      |

### System context and dependencies — `Always`

_Describe the system boundary and external dependencies. Include a C4 System
Context diagram or link when available._

`[Diagram or link: TBD]`

| ID                          | Component / dependency | Responsibility     | Interface or trust boundary | Status                         |
| --------------------------- | ---------------------- | ------------------ | --------------------------- | ------------------------------ |
| `solution.context.item-001` | _<component>_          | _<responsibility>_ | _<interface>_               | _<confirmed / proposed / TBD>_ |

### Static component view — `If applicable`

_Describe containers/components and their relationships. Link the C4 Container
diagram or equivalent. These are the components a Use Case references in the
catalog, so keep the IDs stable._

`[Diagram or link: TBD]`

| ID                             | Component     | Owns / consumes        | Dependencies     | Notes     |
| ------------------------------ | ------------- | ---------------------- | ---------------- | --------- |
| `solution.components.item-001` | _<component>_ | _<capability or data>_ | _<dependencies>_ | _<notes>_ |

### Deployment and architecture view — `If applicable`

_Describe runtime topology, environments, deployment boundaries, and
availability zones or regions where relevant. Link the C4 Deployment diagram or
equivalent._

`[Diagram or link: TBD]`

| ID                             | Environment / boundary | Runtime placement | Scaling / resilience | Status                         |
| ------------------------------ | ---------------------- | ----------------- | -------------------- | ------------------------------ |
| `solution.deployment.item-001` | _<environment>_        | _<placement>_     | _<strategy>_         | _<confirmed / proposed / TBD>_ |

### Assumptions, constraints, and trade-offs — `Always`

| ID                           | Type                                    | Statement or decision | Impact     | Owner / decision date | Evidence |
| ---------------------------- | --------------------------------------- | --------------------- | ---------- | --------------------- | -------- |
| `solution.decision.item-001` | _<assumption / constraint / trade-off>_ | _<statement>_         | _<impact>_ | _<owner / date>_      | _<link>_ |

### Make-or-buy and cross-Use-Case trade-offs — `Optional`

_Describe build-vs-buy decisions and the main cross-Use-Case trade-offs. Mark
`N/A — <confirmed reason>` when not applicable._

`make-or-buy` — _<description or N/A — confirmed reason>_

<!-- id: non-functional -->

## Non-functional requirements and compliance — `Always`

| ID       | Area                                    | Requirement / target              | Verification evidence   | Owner     | Status     |
| -------- | --------------------------------------- | --------------------------------- | ----------------------- | --------- | ---------- |
| `NFR-01` | Performance                             | _<target or TBD>_                 | _<test / metric>_       | _<owner>_ | _<status>_ |
| `NFR-02` | Availability / SLO                      | _<target or TBD>_                 | _<monitoring / report>_ | _<owner>_ | _<status>_ |
| `NFR-03` | Scalability                             | _<target or N/A — reason>_        | _<evidence>_            | _<owner>_ | _<status>_ |
| `NFR-04` | Security                                | _<requirement>_                   | _<review / control>_    | _<owner>_ | _<status>_ |
| `NFR-05` | Legal / privacy                         | _<requirement or N/A — reason>_   | _<DPIA / review>_       | _<owner>_ | _<status>_ |
| `NFR-06` | Business continuity / disaster recovery | _<RPO/RTO or N/A — reason>_       | _<exercise / plan>_     | _<owner>_ | _<status>_ |
| `NFR-07` | Monitoring / observability              | _<logs, metrics, traces, alerts>_ | _<dashboard / runbook>_ | _<owner>_ | _<status>_ |
| `NFR-08` | Accessibility / UX                      | _<requirement or N/A — reason>_   | _<audit / test>_        | _<owner>_ | _<status>_ |

<!-- id: use-case-index -->

## Dynamic component view and Use Case index — `Always`

The individual Use Case documents are maintained by the `uc-engraver` skill.
Keep this section as the DR/SRS catalog only, link-first. Each entry is a stable
`UC-XX` ID, a title, and a link to its child page; in most cases the title is the
user story. Everything else — status (`draft` or `ready`), priority, actor,
source artifact, linked JTBD, components, contracts, trigger, flows, and
acceptance checks — lives on the child page.

| ID      | Title     | Child page                    |
| ------- | --------- | ----------------------------- |
| `UC-01` | _<title>_ | _<link to child page or TBD>_ |

<!-- id: data-contracts -->

## Data and technical contracts — `If applicable`

_Complete for software, APIs, events, integrations, or persisted/transient
data. Otherwise write `N/A — <confirmed reason>`. Keep IDs stable: the Use Case
child pages reference these `contracts.*` entries._

| ID                   | Contract / entity      | Type                                                | Owner     | Version / compatibility | Link     | Status     |
| -------------------- | ---------------------- | --------------------------------------------------- | --------- | ----------------------- | -------- | ---------- |
| `contracts.item-001` | _<contract or entity>_ | _<OpenAPI / AsyncAPI / data / audit / integration>_ | _<owner>_ | _<version>_             | _<link>_ | _<status>_ |

### Data lifecycle and audit — `If applicable`

_Describe data classification, retention, persistence/transience, audit events,
upstream/downstream integrations, and support APIs where applicable._

`contracts.data-lifecycle` — _<description or N/A — confirmed reason>_

<!-- id: execution-readiness -->

## Execution, validation, rollout, and readiness — `Always`

### Delivery strategy — `Always`

| ID                       | Topic                 | Strategy         | Evidence / owner | Status     |
| ------------------------ | --------------------- | ---------------- | ---------------- | ---------- |
| `execution.rollout`      | Rollout / migration   | _<strategy>_     | _<owner>_        | _<status>_ |
| `execution.rollback`     | Rollback / recovery   | _<strategy>_     | _<owner>_        | _<status>_ |
| `execution.dependencies` | Delivery dependencies | _<dependencies>_ | _<owner>_        | _<status>_ |

### Validation strategy — `Always`

_Describe end-to-end acceptance strategy, contract validation, non-functional
verification, observability checks, and evidence locations. Requirement-level
acceptance checks remain in the child Use Cases._

| ID                      | Validation area        | Scenario / evidence            | Owner     | Status     |
| ----------------------- | ---------------------- | ------------------------------ | --------- | ---------- |
| `validation.e2e`        | End-to-end             | _<scenario or link>_           | _<owner>_ | _<status>_ |
| `validation.contracts`  | Contract / integration | _<scenario or link>_           | _<owner>_ | _<status>_ |
| `validation.nfr`        | NFR / compliance       | _<scenario or link>_           | _<owner>_ | _<status>_ |
| `validation.operations` | Operational readiness  | _<runbook / alert / exercise>_ | _<owner>_ | _<status>_ |

### Readiness gates — `Always`

Two gates with different consumers. The normative criteria live in
[`../references/dr-srs-model.md`](../references/dr-srs-model.md); record only
evidence here.

**Review gate** (document-level) — `metadata.status` moves `draft` → `review` →
`baseline` only through this gate.

| ID                      | Criterion                                                                                                                                                                                                                               | Evidence / status  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `ready.outcome-id`      | `metadata.canonical-outcome-id` is present and stable                                                                                                                                                                                   | _<evidence / gap>_ |
| `ready.prd`             | Linked PRD has owner, outcome, JTBD, KPI, and guardrails — or, for a direct DR/SRS intake, outcome and scope are in `Expected outcome`                                                                                                  | _<evidence / gap>_ |
| `ready.solution`        | All `Always` sections are complete, or gaps are explicit; the technology profile is included                                                                                                                                            | _<evidence / gap>_ |
| `ready.conditional`     | Relevant conditional blocks are populated or marked `N/A — <confirmed reason>`                                                                                                                                                          | _<evidence / gap>_ |
| `ready.use-cases`       | Use Case catalog has stable IDs and titles linked to child pages; each selected child declares its priority, status, and minimum core (trigger, main flow, at least one binary acceptance check on Must) or records a gap with an owner | _<evidence / gap>_ |
| `ready.discovery-links` | Figma/Service Blueprint links exist for user-facing work, or a gap is recorded                                                                                                                                                          | _<evidence / gap>_ |
| `ready.contracts`       | Relevant API/event/data contracts are linked or recorded as explicit gaps with an owner                                                                                                                                                 | _<evidence / gap>_ |
| `ready.reviews`         | Privacy, security, accessibility, tracking, and support readiness are addressed, justified, or recorded as gaps with an owner; privacy/security gaps block only the production launch                                                   | _<evidence / gap>_ |
| `ready.rfc-propagation` | Open or accepted RFCs are linked, and accepted decisions are propagated into this DR/SRS for the impacted slices                                                                                                                        | _<evidence / gap>_ |

**Backlog gate** (per-Use-Case) — does not wait for the document review gate.
Each child Use Case page carries a single `draft` or `ready` status; it is
`ready` when it meets the minimum core, has a priority, and names its components
and contracts (or a justified `N/A`). Downstream backlog generation consumes the
`ready` children; the DR/SRS catalog does not repeat their status.

<!-- id: specialist-appendices -->

## Specialist appendices — `Optional`

_Optional material such as UX/UI details, analytics taxonomy, operational
runbooks, cost analysis, or diagrams. Appendices support but do not replace the
DR/SRS or Use Case documents._

`appendices` — _<links or N/A — confirmed reason>_

<!-- id: open-questions -->

## Open questions, assumptions, decisions, and change propagation — `Always`

_Pre-baseline uncertainty is a gap or open question; a post-baseline material
change is a Change Request (`CR-YYYY-NNN`). Duplicate or unresolvable
identifiers become a `possible-duplicate`/gap and wait for a human decision
before any write. Every material gap carries an owner._

| ID              | Type                                      | Item     | Impact / blocker | Owner     | Decision or propagation date | Resolution / link      |
| --------------- | ----------------------------------------- | -------- | ---------------- | --------- | ---------------------------- | ---------------------- |
| `open.item-001` | _<question / assumption / decision / CR>_ | _<item>_ | _<impact>_       | _<owner>_ | _<date / TBD>_               | _<resolution or link>_ |
