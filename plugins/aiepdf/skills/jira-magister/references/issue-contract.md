# Jira issue contract

## Portable fields

Project-specific Jira fields vary. Query the project metadata first, then map
these portable fields to the available schema:

| Issue | Required content                                                                                                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic  | outcome-oriented summary; scope and exclusions; linked PRD and DR/SRS; included `JTBD-XX` and `UC-XX`; KPI target and qualitative guardrail; dependencies, readiness, and lifecycle note      |
| Story | exact actor-facing `As a [Actor], I want to [action], so that [Gain]` summary; one-sprint scope; parent Epic; source `UC-XX` and `AC-*`; binary acceptance checks; user-facing links and gaps |
| Task  | concrete enabling outcome; one-sprint scope; parent Epic or Story; source contract/NFR/readiness/gap ID; dependency and verification evidence                                                 |

Descriptions may summarize source behavior, but the DR/SRS and Use Case remain
authoritative. Always include links to the source documents and stable IDs in a
machine-readable line, for example:

```text
Source: DR-01 | JTBD-02 | UC-03 | AC-UC-03-01
```

## Sizing and decomposition

- An Epic groups related Stories and Tasks for one cohesive outcome and should
  finish in a few two-week sprints.
- A Story expresses actor value and should fit one two-week sprint.
- A Task is technical or enabling work and should fit one two-week sprint.
- Split work when it crosses actors, outcomes, acceptance boundaries, or sprint
  capacity. Flag the split for approval when the source does not define the
  boundary.

## Definition of Ready blockers

Block creation when any material item is missing or contradictory:

- PRD owner, outcome, JTBD, KPI, or qualitative guardrail;
- complete required DR/SRS sections;
- stable Use Case ID, priority/lifecycle context, or binary acceptance checks;
- relevant Figma/Service Blueprint, API/event/data contract, privacy, security,
  accessibility, tracking, support, or rollout evidence;
- accepted RFC propagation into the DR/SRS.

Report each blocker with its source, impact, and required resolution. Do not
replace it with a guessed Jira value.

## Synchronization matching

Use the first unambiguous match:

1. supplied Jira key;
2. stored Jira URL or source mapping with the stable source ID;
3. exact stable source ID in the target project;
4. no match: propose creation;
5. multiple matches: stop and ask the user to choose.

For updates, show a field-level diff. Preserve issue keys, parent Epic,
unchanged acceptance IDs, existing status, and content outside the confirmed
change. Add a new traceability ID only when the source introduces new meaning.

## Confirmation and verification

Confirmation must identify the project, operation, item count, hierarchy,
material field changes, and any unresolved non-blocking gaps. After confirmation,
create/update parent items before children, then re-fetch and verify every
relationship and source marker. A failed verification makes the operation
incomplete.
