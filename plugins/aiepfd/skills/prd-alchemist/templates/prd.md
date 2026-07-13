# PRD — _<initiative title>_

<!--
  AUTHORING GUIDANCE — DELETE THIS ENTIRE COMMENT BLOCK IN THE FINISHED DOCUMENT.

  Write the machine-first PRD in English. Replace every placeholder with
  confirmed content. Do not write the PRD while a blocking item remains open.
  Keep every stable section comment and every ID table entry exactly as written.
  Use "Not applicable — <reason confirmed by user>" instead of deleting a field.
  Set metadata.status to draft. Never translate stable IDs.
-->

<!-- id: input -->

## Source inputs

| ID                     | Source or reference | What it contributed   |
| ---------------------- | ------------------- | --------------------- |
| `input.strategic`      | _<link or source>_  | _<strategic input>_   |
| `input.raw-collection` | _<link or source>_  | _<gathered material>_ |

<!-- id: metadata -->

## Metadata

| ID                      | Value                                             |
| ----------------------- | ------------------------------------------------- |
| `metadata.status`       | draft                                             |
| `metadata.deadline`     | _<one or more deadlines>_                         |
| `metadata.start`        | _<input-collection start date, YYYY-MM-DD>_       |
| `metadata.end`          | _<observation closing date, YYYY-MM-DD>_          |
| `metadata.budget`       | _<budget source or confirmed not applicable>_     |
| `metadata.priority`     | _<business priority>_                             |
| `metadata.sponsor`      | _<initiative sponsor>_                            |
| `metadata.jira`         | _<primary Jira initiative or governing epic key>_ |
| `metadata.last-updated` | _<YYYY-MM-DD>_                                    |

<!-- id: artifacts -->

## Related artifacts

Keep every category. Leave the link empty only when the artifact does not exist
yet; use the notes column to explain whether it is expected later or confirmed
not applicable.

| ID                            | Category                               | Link                                                  | Notes                       |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------- | --------------------------- |
| `artifacts.jira`              | Jira                                   | _<link to initiative board or primary Jira artifact>_ | _<status or applicability>_ |
| `artifacts.design`            | Design / prototypes                    | _<link>_                                              | _<status or applicability>_ |
| `artifacts.budget-costs`      | Budget and costs                       | _<link>_                                              | _<status or applicability>_ |
| `artifacts.related-rfc`       | PRD-related RFCs                       | _<link>_                                              | _<status or applicability>_ |
| `artifacts.design-review-srs` | Design Review / linked SRS             | _<link>_                                              | _<status or applicability>_ |
| `artifacts.lrr-rollout`       | Launch Readiness Review / Rollout Plan | _<link>_                                              | _<status or applicability>_ |

<!-- id: why -->

## Why

<!-- id: why.need -->

### Need definition

_<The user or business problem to solve, supported by evidence and without
assuming a solution.>_

<!-- id: why.target-audience -->

### Target audience

_<The intended users or customers, including relevant segments and needs.>_

<!-- id: why.goals -->

### Business and user goals

| ID                   | Type     | Goal                            | Evidence   |
| -------------------- | -------- | ------------------------------- | ---------- |
| `why.goals.business` | Business | _<measurable business outcome>_ | _<source>_ |
| `why.goals.user`     | User     | _<measurable user outcome>_     | _<source>_ |

<!-- id: why.measurement -->

### Measurement plan

Use concrete objectives and measurable key results or product KPIs. Do not use
generic placeholders such as "metrics to be defined".

| ID                         | Objective / KPI | Baseline          | Target           | Measurement source           | Review date |
| -------------------------- | --------------- | ----------------- | ---------------- | ---------------------------- | ----------- |
| `why.measurement.item-001` | _<metric>_      | _<current value>_ | _<target value>_ | _<dashboard or data source>_ | _<date>_    |

<!-- id: why.strategic-dependencies -->

### Strategic dependencies

_<External and internal stakeholders, policy or business constraints, and
dependencies that affect the initiative.>_

<!-- id: why.strategic-dependencies.raci -->

#### Responsibility matrix

The rows below contain the standard lifecycle assignments. Confirm that the
standard applies to this initiative, or replace it with user-confirmed
assignments. Use `R`, `A`, `C`, and `I`; leave a cell empty only when the user
confirms no role is assigned.

| ID                             | Phase / activity                  | PM  | Domain stakeholders | Committee | Engineering |
| ------------------------------ | --------------------------------- | --- | ------------------- | --------- | ----------- |
| `why.raci.collection-writing`  | Collection and structured writing | R   | C                   |           |             |
| `why.raci.feedback`            | Feedback collection               | R   | C                   |           | I           |
| `why.raci.completeness-review` | Completeness review               | R   |                     |           |             |
| `why.raci.submit-evaluation`   | Submit and Go/No-Go evaluation    | R   | I                   | A         | I           |
| `why.raci.execution`           | Execution / delivery              | C   | I                   | I         | R           |
| `why.raci.monitoring-closure`  | Monitoring / closure              | R   | C                   | I         | C           |

<!-- id: why.strategic-dependencies.risks -->

#### Risks and quality constraints

Include product, business, compliance, service-quality, and customer-impact
risks. Keep detailed test acceptance criteria in downstream specifications.

| ID                   | Risk or constraint | Impact     | Mitigation / owner       |
| -------------------- | ------------------ | ---------- | ------------------------ |
| `why.risks.item-001` | _<risk>_           | _<impact>_ | _<mitigation and owner>_ |

<!-- id: what -->

## What

<!-- id: what.as-is -->

### Current process

_<How the current process or product works today, including observed pain
points.>_

<!-- id: what.use-cases -->

### Use cases

Prioritize every use case with MoSCoW. `Won't` means explicitly excluded from
this initiative, not permanently rejected.

| ID                        | Priority                          | Actor     | Use case     | Expected outcome |
| ------------------------- | --------------------------------- | --------- | ------------ | ---------------- |
| `what.use-cases.item-001` | _<Must / Should / Could / Won't>_ | _<actor>_ | _<use case>_ | _<outcome>_      |

<!-- id: what.scope -->

### Scope

<!-- id: what.scope.in -->

#### In scope

- _<confirmed in-scope item>_

<!-- id: what.scope.out -->

#### Out of scope

- _<confirmed out-of-scope item>_

<!-- id: what.support-needs -->

### Customer care needs

_<Customer-care stakeholders, likely contact reasons, and experience points
that require support preparation or monitoring. Do not write the downstream
operational support specification here.>_

<!-- id: what.linked-epics -->

### Linked user stories and epics

Provide read-only references and current status for the individual delivery
epics or user-story groups. The primary governing Jira reference remains in
`metadata.jira`; the initiative board or artifact link remains in
`artifacts.jira`. Do not generate backlog items.

| ID                           | Jira reference  | Status     | Notes     |
| ---------------------------- | --------------- | ---------- | --------- |
| `what.linked-epics.item-001` | _<link or key>_ | _<status>_ | _<notes>_ |

<!-- id: how -->

## How

Keep this section at product-solution level. Link technical specifications
rather than copying implementation details into the PRD.

<!-- id: how.experience -->

### Experience

_<Customer journey, experience intent, and links to Figma or prototypes.>_

<!-- id: how.technical-solutions -->

### Technical solution references

_<High-level solution direction and links to relevant RFCs, design reviews, or
SRS documents. Do not duplicate their technical detail.>_

<!-- id: how.technical-dependencies -->

### Technical dependencies

_<Downstream systems, platform constraints, prerequisites, and technical
dependencies that affect feasibility or sequencing.>_

<!-- id: how.release-plan -->

### Release plan

_<High-level release timeline and links to the Launch Readiness Review and
Rollout Plan when available.>_

<!-- id: project -->

## Project management & monitoring

<!-- id: project.decision-change-log -->

### Decision and change log

| ID                     | Date     | Decision or change     | Rationale     | Owner     |
| ---------------------- | -------- | ---------------------- | ------------- | --------- |
| `project.log.item-001` | _<date>_ | _<decision or change>_ | _<rationale>_ | _<owner>_ |

<!-- id: project.pmo -->

### Project chart, schedule, and status

| ID                     | Item             | Reference or status        |
| ---------------------- | ---------------- | -------------------------- |
| `project.pmo.chart`    | Project chart    | _<link or status>_         |
| `project.pmo.schedule` | Schedule outline | _<link or summary>_        |
| `project.pmo.report`   | Status report    | _<link or current status>_ |

<!-- id: project.decisions-research -->

### Decisions and research

No blocking item may remain open when this PRD is written. Keep confirmed
non-blocking follow-ups visible.

| ID                           | Type                        | Item                     | Owner     | Due date | Status / resolution                       |
| ---------------------------- | --------------------------- | ------------------------ | --------- | -------- | ----------------------------------------- |
| `project.decisions.item-001` | _<Blocking / Non-blocking>_ | _<decision or research>_ | _<owner>_ | _<date>_ | _<resolved decision or open non-blocker>_ |
