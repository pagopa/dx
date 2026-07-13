---
metadata:
  status: draft
  deadline: "<one or more deadlines>"
  start: "<input-collection start date, YYYY-MM-DD>"
  end: "<observation closing date, YYYY-MM-DD>"
  budget: "<budget source or confirmed not applicable>"
  priority: "<business priority>"
  sponsor: "<initiative sponsor>"
  last-updated: "<YYYY-MM-DD>"
---

# PRD — _<initiative title>_

<!--
  AUTHORING GUIDANCE — DELETE THIS ENTIRE COMMENT BLOCK IN THE FINISHED DOCUMENT.

  Write the machine-first PRD in English. Replace every placeholder with
  confirmed content. Do not write the PRD while a blocking item remains open.
  Keep every stable section comment, every frontmatter key, and every ID table
  entry exactly as written. Use "Not applicable — <reason confirmed by user>"
  instead of deleting a field. Set metadata.status to draft. Never translate
  stable IDs.
-->

<!-- id: input -->

## Source inputs

| ID                     | Source or reference | What it contributed   |
| ---------------------- | ------------------- | --------------------- |
| `input.strategic`      | _<link or source>_  | _<strategic input>_   |
| `input.raw-collection` | _<link or source>_  | _<gathered material>_ |

<!-- id: artifacts -->

## Related artifacts

Keep every category. Leave the link empty only when the artifact does not exist
yet; use the notes column to explain whether it is expected later or confirmed
not applicable.

| ID                       | Category            | Link     | Notes                       |
| ------------------------ | ------------------- | -------- | --------------------------- |
| `artifacts.design`       | Design / prototypes | _<link>_ | _<status or applicability>_ |
| `artifacts.budget-costs` | Budget and costs    | _<link>_ | _<status or applicability>_ |

<!-- id: why -->

## Why

<!-- id: why.need -->

### Need definition

_<The user or business problem to solve, supported by evidence and without
assuming a solution.>_

<!-- id: why.target-audience -->

### Target audience

_<The intended users or customers, including relevant segments and needs.>_

<!-- id: why.jobs-to-be-done -->

### Jobs to be done

Describe the job from the user's perspective: when the user is in a
particular situation, they want to make progress toward an expected outcome.

| ID                             | Job statement                             | Evidence   |
| ------------------------------ | ----------------------------------------- | ---------- |
| `why.jobs-to-be-done.item-001` | _<When ..., I want to ..., so I can ...>_ | _<source>_ |

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

<!-- id: how -->

## How

Keep this section at product-solution level. Link technical specifications
rather than copying implementation details into the PRD.

<!-- id: how.experience -->

### Experience

_<Customer journey, experience intent, and links to Figma or prototypes.>_

<!-- id: how.technical-solutions -->

### Technical solution references

_<High-level solution direction and links to relevant technical artifacts. Do
not duplicate their technical detail.>_

<!-- id: how.technical-dependencies -->

### Technical dependencies

_<Downstream systems, platform constraints, prerequisites, and technical
dependencies that affect feasibility or sequencing.>_

<!-- id: how.release-plan -->

### Release plan

_<High-level release timeline. Keep operational rollout details in downstream
release artifacts.>_
