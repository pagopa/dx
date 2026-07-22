# PRD - _<initiative title>_

<!--
  AUTHORING GUIDANCE — DELETE THIS ENTIRE COMMENT BLOCK IN THE FINISHED DOCUMENT.

  Replace placeholders only with confirmed information. A draft may be
  incomplete: record missing information as an open question, assumption, or
  justified Not applicable value.
  Give every narrative sentence an explicit subject that identifies the actor,
  owner, user group, team, stakeholder, or system. If the source does not name
  the subject, record a targeted open question instead of inventing one.
  Preserve every stable section comment and every ID exactly as written.
  Status starts as draft. Change it to review only after explicit user
  confirmation and validation of the review-entry criteria.
-->

<!-- id: metadata -->

## Metadata

| ID                          | Value                                                     |
| --------------------------- | --------------------------------------------------------- |
| `metadata.status`           | draft                                                     |
| `metadata.sponsor`          | _<name or function>_                                      |
| `metadata.owner`            | _<Product owner>_                                         |
| `metadata.budget`           | _<budget source or Not applicable - reason>_              |
| `metadata.legal-compliance` | _<N/A / Requested / Received / Formal review required>_   |
| `metadata.engineering`      | _<N/A / Requested / Received / Formal analysis required>_ |
| `metadata.target-release`   | _<date, quarter, or Not applicable - reason>_             |
| `metadata.priority`         | _<High / Medium / Low / Not applicable - reason>_         |

<!-- id: need -->

## Need definition

_<Name the affected users or business actors and describe their context and need
without assuming a solution.>_

<!-- id: actors -->

## Actors

| ID                | Persona or actor | Definition of behavior and needs |
| ----------------- | ---------------- | -------------------------------- |
| `actors.item-001` | _<persona>_      | _<confirmed description>_        |

<!-- id: objectives -->

## Objectives

<!-- id: objectives.user-goals -->

### User goals

For user-facing initiatives, express each goal as a JTBD:
“When [situation], I want [objective], so I can [expected outcome].”

| ID                         | Persona     | Job statement                          | Expected outcome | Success metric | Quality guardrail | Priority                  | Notes     |
| -------------------------- | ----------- | -------------------------------------- | ---------------- | -------------- | ----------------- | ------------------------- | --------- |
| `objectives.jtbd.item-001` | _<persona>_ | _<When ..., I want ..., so I can ...>_ | _<outcome>_      | _<metric>_     | _<guardrail>_     | _<Must / Should / Could>_ | _<notes>_ |

<!-- id: objectives.business-goals -->

### Business goals

_<Include when the initiative has a confirmed business outcome.>_

| ID                             | Business objective | Success metric | Priority     | Notes     |
| ------------------------------ | ------------------ | -------------- | ------------ | --------- |
| `objectives.business.item-001` | _<objective>_      | _<metric>_     | _<priority>_ | _<notes>_ |

<!-- id: metrics -->

## Success metrics

<!-- id: metrics.outcome-kpis -->

### Outcome KPIs

_<KPIs that measure the product or business outcome and cannot be reduced to a
single JTBD.>_

| ID                     | KPI     | Baseline     | Target     | Source          | Review date |
| ---------------------- | ------- | ------------ | ---------- | --------------- | ----------- |
| `metrics.kpi.item-001` | _<KPI>_ | _<baseline>_ | _<target>_ | _<data source>_ | _<date>_    |

<!-- id: metrics.quality-guardrails -->

### Quality guardrails

_<Reliability, compliance, accessibility, support, or service-quality limits
that must not regress while pursuing the outcome.>_

| ID                           | Guardrail     | Threshold     | Measurement source | Owner     |
| ---------------------------- | ------------- | ------------- | ------------------ | --------- |
| `metrics.guardrail.item-001` | _<guardrail>_ | _<threshold>_ | _<source>_         | _<owner>_ |

<!-- id: strategic-dependencies -->

## Strategic dependencies

_<Internal and external stakeholders, services, policies, or initiatives that
affect the opportunity, scope, priority, or feasibility.>_

| ID                      | Dependency or stakeholder | Impact     | Owner     | Status     |
| ----------------------- | ------------------------- | ---------- | --------- | ---------- |
| `dependencies.item-001` | _<dependency>_            | _<impact>_ | _<owner>_ | _<status>_ |

<!-- id: context-constraints -->

## Context and constraints

_<Include when relevant: market context, competitors, legal or regulatory
constraints, technical constraints, or other boundaries.>_

| ID                     | Area     | Context or constraint | Impact     | Notes     |
| ---------------------- | -------- | --------------------- | ---------- | --------- |
| `constraints.item-001` | _<area>_ | _<constraint>_        | _<impact>_ | _<notes>_ |

<!-- id: feasibility-red-flags -->

## Initial feasibility red flags

_<Record preliminary risks that may require formal analysis. Do not present
preliminary opinions as formal feasibility approval.>_

| ID                   | Area                                                     | Red flag or risk | Impact     | Owner     | Action required |
| -------------------- | -------------------------------------------------------- | ---------------- | ---------- | --------- | --------------- |
| `red-flags.item-001` | _<Legal / Privacy / Security / Technology / Operations>_ | _<risk>_         | _<impact>_ | _<owner>_ | _<next action>_ |

<!-- id: design-discovery -->

## Design discovery and Service Blueprint

_<Include when applicable, or write Not applicable with a confirmed reason.
Link or summarize the discovery design: frontstage touchpoints, backstage
processes, pain points, opportunities, and open UX assumptions.>_

| ID                          | Discovery item | Reference or description | Status     |
| --------------------------- | -------------- | ------------------------ | ---------- |
| `design-discovery.item-001` | _<item>_       | _<link or description>_  | _<status>_ |

<!-- id: open-questions -->

## Open questions, assumptions, and hypotheses

_<Track only items that can affect scope, priority, outcome, or feasibility.
Detailed edge cases and implementation questions belong in downstream
specifications.>_

| ID                        | Question, assumption, or hypothesis | Blocking for review? | Owner     | Expected decision date | Resolution or link    |
| ------------------------- | ----------------------------------- | -------------------- | --------- | ---------------------- | --------------------- |
| `open-questions.item-001` | _<item>_                            | _<Yes / No>_         | _<owner>_ | _<date>_               | _<TBD or resolution>_ |

<!-- id: support-readiness -->

## Support readiness

_<Include when applicable. Capture whether support or operations involvement,
knowledge-base material, runbooks, FAQs, or support tooling are needed. Keep
detailed operational procedures outside the PRD.>_

| ID                                 | Readiness question                            | Answer                           | Notes     |
| ---------------------------------- | --------------------------------------------- | -------------------------------- | --------- |
| `support-readiness.involvement`    | _<Is Support/Ops involvement needed?>_        | _<Yes / No / To assess>_         | _<notes>_ |
| `support-readiness.knowledge-base` | _<Are KB, FAQ, or runbook materials needed?>_ | _<Yes / No / N/A>_               | _<notes>_ |
| `support-readiness.user-errors`    | _<Are relevant user errors expected?>_        | _<Yes / No / To assess>_         | _<notes>_ |
| `support-readiness.tools`          | _<Are support APIs or tools needed?>_         | _<Yes / No / manual-only / N/A>_ | _<notes>_ |
