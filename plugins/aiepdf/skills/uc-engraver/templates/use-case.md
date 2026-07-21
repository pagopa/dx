---
title: "<Use Case title>"
id: UC-XX
status: candidate
---

<!--
  Preserve the stable Use Case ID and every existing AC-* ID when updating.
  Replace placeholders with confirmed information, explicit assumptions,
  open questions, proposed values, or justified N/A values.
-->

# `<UC-XX>` — <Use Case title>

## Traceability

| Field | Value |
| --- | --- |
| `uc.id` | `UC-XX` |
| `uc.title` | _<Use Case title>_ |
| `uc.status` | candidate |
| `uc.priority` | _<Must / Should>_ |
| `uc.linked-jtbd` | _<JTBD-XX or N/A — confirmed reason>_ |
| `uc.parent-dr` | _<parent DR/SRS path or URL>_ |
| `uc.source-artifact` | _<PRD / Service Blueprint / Figma / RFC / task or N/A — reason>_ |
| `uc.service-blueprint-step` | _<step or N/A — confirmed reason>_ |

## Actors

| Role | Actor name from PRD | Responsibility |
| --- | --- | --- |
| Primary actor | _<exact PRD actor name>_ | _<responsibility>_ |
| Secondary actor | _<exact PRD actor name or N/A — reason>_ | _<responsibility or N/A>_ |

## Behavior contract

**Trigger**: _<event that starts the Use Case>_

**Preconditions**:

- _<condition or explicit gap>_

**Main flow**:

1. _<actor action>_
2. _<system response>_
3. _<next observable step>_

**Alternate flows**:

- `A1`: _<condition and alternate behavior, or N/A — confirmed reason>_

**Exception flows / edge cases**:

- `E1`: _<failure, boundary, or recovery behavior, or N/A — confirmed reason>_

**Postconditions**:

- _<observable state or outcome>_

## Sequence diagram

Use an inline Mermaid or PlantUML diagram to show the primary interaction.

```mermaid
sequenceDiagram
  participant Actor
  participant System
  Actor->>System: <trigger or action>
  System-->>Actor: <observable response>
```

## Acceptance checks

Each check must be binary, independently verifiable, and stable across
updates. Link it to evidence or a test when available.

- `AC-UC-XX-01`: _<binary check>_ — Evidence: _<link, test, or TBD>_
- `AC-UC-XX-02`: _<binary check>_ — Evidence: _<link, test, or TBD>_

## Tracking events

| Event ID / name | Trigger or flow step | Channel / source | Purpose | Status |
| --- | --- | --- | --- | --- |
| _<event name or N/A — confirmed reason>_ | _<step or N/A>_ | _<web/mobile/system or N/A>_ | _<metric or purpose>_ | _<confirmed / proposed / TBD>_ |

## Relevant links

- Figma / design flow: _<link or N/A — confirmed reason>_
- Endpoint / OpenAPI / AsyncAPI / Data Contract: _<operation ID, link, or N/A — reason>_
- Validation evidence: _<test plan, mock, report, or TBD>_

## Open questions and propagation

| ID | Type | Item | Impact / blocker | Owner | Resolution / link |
| --- | --- | --- | --- | --- | --- |
| `uc-open-01` | _<question / assumption / proposed decision>_ | _<item>_ | _<impact>_ | _<owner / TBD>_ | _<TBD>_ |
