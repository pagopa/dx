# PRD - _<initiative title>_

<!--
  AUTHORING GUIDANCE — DELETE THIS ENTIRE COMMENT BLOCK IN THE FINISHED DOCUMENT.
  The structure is authoritative. Authoring rules live in SKILL.md; lifecycle
  gate criteria live in references/lifecycle-and-gates.md. Remove the
  `(Always)`, `(If Applicable)`, and `(Optional)` labels from final headings.
-->

<!-- id: metadata -->

## Metadata (Always)

| ID                            | Value                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `metadata.status`             | draft                                                                                      |
| `metadata.sponsor`            | _<name or function>_                                                                       |
| `metadata.owner`              | _<Product owner>_                                                                          |
| `metadata.budget`             | _<budget source or Not applicable — reason>_                                               |
| `metadata.legal-compliance`   | _<Not assessed — request status unknown / Requested / Received / Not applicable — reason>_ |
| `metadata.engineering`        | _<Not assessed — request status unknown / Requested / Received / Not applicable — reason>_ |
| `metadata.target-release`     | _<date, quarter or Not applicable — reason>_                                               |
| `metadata.priority`           | _<High / Medium / Low / Not applicable — reason>_                                          |
| `metadata.product-review`     | _<Pending / Approved by <name> (<role>) on <YYYY-MM-DD>>_                                  |
| `metadata.design-review`      | _<Pending / Approved by <name> (<role>) on <YYYY-MM-DD>>_                                  |
| `metadata.approval-decision`  | _<Undecided / Proceed decision by <name> (<role>) on <YYYY-MM-DD>>_                        |
| `metadata.delivery-alignment` | _<Unconfirmed / Confirmed by <name> (<role>) on <YYYY-MM-DD>>_                             |

<!-- id: related-artifacts -->

## Related Artifacts (Optional)

_<Include when applicable, or write Not applicable with a confirmed reason.
Links to a solution design do not substitute for formal Product or Design
review sign-offs. Keep the review record separate from the execution-ready
solution-design reference.>_

| ID                                   | Artifact                     | Link or reference                   | Status / notes                                             |
| ------------------------------------ | ---------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| `artifacts.design-review`            | Product and Design Review    | _<link or N/A - reason>_            | _<linked review evidence; not a sign-off by itself>_       |
| `artifacts.solution-design`          | Solution Design              | _<link or N/A - reason>_            | _<linked and aligned to approved PRD / not yet available>_ |
| `artifacts.figma`                    | Figma / Design Exploration   | _<link or N/A - reason>_            | _<relevant prototype or flow>_                             |
| `artifacts.service-blueprint`        | Service Blueprint            | _<link or N/A - reason>_            | _<relevant journey>_                                       |
| `artifacts.rfc`                      | Technical Proposals          | _<link or N/A - reason>_            | _<technical proposal link>_                                |
| `artifacts.analytics`                | Analytics / Funnel Dashboard | _<link or N/A - reason>_            | _<metrics data source>_                                    |
| `artifacts.epic-board`               | Jira Epic / Delivery Board   | _<links or N/A - confirmed reason>_ | _<available / not yet available; owner or gap>_            |
| `artifacts.post-release-observation` | Post-release Outcomes        | _<link or N/A - confirmed reason>_  | _<observation window, measured outcomes, owner>_           |
| `artifacts.closure-decision`         | Closure Decision             | _<decision log or reference>_       | _<completed / superseded / canceled; decision owner/date>_ |

<!-- id: need -->

## Need Definition (Always)

_<Name the affected users or business actors and describe their context and need
without assuming a solution.>_

<!-- id: actors -->

## Target Users (Always)

| Persona                       | Definition                       |
| ----------------------------- | -------------------------------- |
| `actors.item-001` _<persona>_ | _<confirmed behavior and needs>_ |

<!-- id: scope-boundaries -->

## Scope and Boundaries (Optional)

_<Record product outcomes/capabilities in scope and explicit non-goals. Keep
system components, protocols, and implementation details in downstream
technical artifacts.>_

| ID                            | Boundary     | Description  | Confirmation or source |
| ----------------------------- | ------------ | ------------ | ---------------------- |
| `scope.in-scope.item-001`     | In scope     | _<outcome>_  | _<evidence>_           |
| `scope.out-of-scope.item-001` | Out of scope | _<non-goal>_ | _<evidence>_           |

<!-- id: objectives -->

## Objectives (Always)

<!-- id: objectives.user-goals -->

### User Goals (Always)

For user-facing initiatives, express each goal as a JTBD:
“When [situation], I want [objective], so I can [expected outcome].”

| Goal ID                    | Persona     | Job statement                          | Expected outcome | Success metric            | Quality guardrail            | Priority                                               | Notes                 |
| -------------------------- | ----------- | -------------------------------------- | ---------------- | ------------------------- | ---------------------------- | ------------------------------------------------------ | --------------------- |
| `objectives.jtbd.item-001` | _<persona>_ | _<When ..., I want ..., so I can ...>_ | _<outcome>_      | _<metric or unconfirmed>_ | _<guardrail or unconfirmed>_ | _<Must / Should / Could / Unconfirmed — not provided>_ | _<notes and sources>_ |

<!-- id: objectives.business-goals -->

### Business Goals (If Applicable)

_<Include when the initiative has a business outcome. If applicability is
unknown, retain this table with explicit gaps rather than inventing a goal or
omitting the section. Omit only when non-applicability is confirmed.>_

| Goal ID                        | Business goal | Success metric            | Priority                              | Notes                 |
| ------------------------------ | ------------- | ------------------------- | ------------------------------------- | --------------------- |
| `objectives.business.item-001` | _<goal>_      | _<metric or unconfirmed>_ | _<confirmed priority or Unconfirmed>_ | _<notes and sources>_ |

<!-- id: metrics -->

## Success Metrics (Always)

<!-- id: metrics.outcome-kpis -->

### Outcome KPIs (If Applicable)

_<KPIs that measure the product or business outcome and cannot be reduced to a
single JTBD.>_

| ID                     | KPI     | Baseline                                             | Target                                             | Source          | Review date                                 | Owner                             |
| ---------------------- | ------- | ---------------------------------------------------- | -------------------------------------------------- | --------------- | ------------------------------------------- | --------------------------------- |
| `metrics.kpi.item-001` | _<KPI>_ | _<confirmed value and exact period, or unconfirmed>_ | _<confirmed target or Unconfirmed — not provided>_ | _<data source>_ | _<confirmed date/cadence; label proposals>_ | _<confirmed owner or Unassigned>_ |

<!-- id: metrics.quality-guardrails -->

### Mandatory Quality Guardrails (If Applicable)

_<Reliability, compliance, accessibility, support, or service-quality limits
that must not regress while pursuing the outcome.>_

| ID                           | Guardrail                     | Threshold                                             | Measurement source        | Owner                             |
| ---------------------------- | ----------------------------- | ----------------------------------------------------- | ------------------------- | --------------------------------- |
| `metrics.guardrail.item-001` | _<source-grounded guardrail>_ | _<confirmed threshold or Unconfirmed — not provided>_ | _<source or unconfirmed>_ | _<confirmed owner or Unassigned>_ |

<!-- id: strategic-dependencies -->

## Strategic Dependencies (Always)

_<Internal and external stakeholders, services, policies, or initiatives that
affect the opportunity, scope, priority, or feasibility.>_

| ID                      | Dependency or stakeholder | Impact     | Owner     | Status     |
| ----------------------- | ------------------------- | ---------- | --------- | ---------- |
| `dependencies.item-001` | _<dependency>_            | _<impact>_ | _<owner>_ | _<status>_ |

<!-- id: context-constraints -->

## Context and Constraints (Optional)

_<Include when relevant: market context, competitors, legal or regulatory
constraints, technical constraints, or other boundaries.>_

| ID                     | Area     | Context or constraint | Impact     | Notes     |
| ---------------------- | -------- | --------------------- | ---------- | --------- |
| `constraints.item-001` | _<area>_ | _<constraint>_        | _<impact>_ | _<notes>_ |

<!-- id: feasibility-red-flags -->

## Initial Feasibility Red Flags (Optional)

_<Record preliminary risks that may require formal analysis. Do not present
preliminary opinions as formal feasibility approval.>_

| ID                   | Area                                                     | Red flag / risk | Impact     | Owner     | Required action                                                                         |
| -------------------- | -------------------------------------------------------- | --------------- | ---------- | --------- | --------------------------------------------------------------------------------------- |
| `red-flags.item-001` | _<Legal / Privacy / Security / Technology / Operations>_ | _<risk>_        | _<impact>_ | _<owner>_ | _<disposition and next action: To address / Addressed / Mitigated / Accepted — detail>_ |

<!-- id: design-discovery -->

## Experience and Service Blueprint (If Applicable)

_<Include when applicable, or write Not applicable with a confirmed reason.
Link or summarize the discovery design: frontstage touchpoints, backstage
processes, pain points, opportunities, and open UX assumptions.>_

| ID                          | Discovery item | Reference or description                                                        | Status                                        |
| --------------------------- | -------------- | ------------------------------------------------------------------------------- | --------------------------------------------- |
| `design-discovery.item-001` | _<item>_       | _<sourced touchpoints only; do not infer backstage behavior or implementation>_ | _<confirmed, proposed, untested, or unknown>_ |

<!-- id: open-questions -->

## Open Questions, Assumptions, and Hypotheses (Optional)

_<Track only items that can affect scope, priority, outcome, or feasibility.
Include the impact of leaving each question unresolved in the Question / hypothesis
cell. Blocking? refers to the next lifecycle transition being assessed: for
discovery, mark Yes only when the unresolved issue challenges the initiative's
core reason, intended users, or outcome; for later gates, mark Yes when the
issue prevents that gate. Use only a binary yes/no answer. Detailed edge cases and
implementation questions belong in downstream specifications.>_

| ID                        | Question / hypothesis                                 | Blocking?    | Owner     | Decision expected by | Outcome / link        |
| ------------------------- | ----------------------------------------------------- | ------------ | --------- | -------------------- | --------------------- |
| `open-questions.item-001` | _<question or hypothesis; impact if unresolved: ...>_ | _<Yes / No>_ | _<owner>_ | _<date>_             | _<TBD or resolution>_ |

<!-- id: support-readiness -->

## Support and Operations Readiness (If Applicable)

_<Include when applicable. Capture whether support or operations involvement,
knowledge-base material, runbooks, FAQs, or support tooling are needed. Keep
detailed operational procedures outside the PRD.>_

| ID                                 | Readiness question                             | Answer                                 | Notes     |
| ---------------------------------- | ---------------------------------------------- | -------------------------------------- | --------- |
| `support-readiness.involvement`    | _<Is Support/Operations involvement needed?>_  | _<Yes / No / To assess>_               | _<notes>_ |
| `support-readiness.knowledge-base` | _<Are KB materials, FAQs or runbooks needed?>_ | _<Yes / No / Not applicable — reason>_ | _<notes>_ |
| `support-readiness.user-errors`    | _<Are significant user errors expected?>_      | _<Yes / No / To assess>_               | _<notes>_ |
| `support-readiness.tools`          | _<Are APIs or support tools needed?>_          | _<Yes / No / Not applicable — reason>_ | _<notes>_ |
