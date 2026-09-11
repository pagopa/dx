---
id: UC-XX
status: draft
priority: <Must / Should>
parent_dr: <parent DR/SRS path or URL>
---

<!--
  Preserve the stable Use Case ID and every existing AC-* ID when updating.
  Replace placeholders with confirmed information, explicit assumptions,
  open questions, proposed values, or justified N/A values.
  Keep the canonical body fields in this order so the Markdown maps directly
  to the DR-01 Confluence Use Case template.
-->

# `UC-XX`: <Use Case title>

**Linked JTBD**: _<JTBD-XX or N/A - confirmed reason>_

**Primary actor**: _<exact PRD actor name>_

**Secondary actors**: _<exact PRD actor names or N/A - confirmed reason>_

**Source artifact**: _<PRD / Service Blueprint / Figma discovery / RFC / Call for Task>_

**Service Blueprint step**: _<step or touchpoint, or N/A - confirmed reason>_

**Domain entities**: _<entity names from the parent `Domain model and glossary`, or N/A - confirmed reason>_

**Trigger**: _<event that starts the Use Case>_

**Preconditions**:

- _<condition or explicit gap>_

**Main flow**:

1. _<actor action>_
2. _<system response>_
3. _<next observable step>_

**Alternate flows**:

- `A1`: _<condition and alternate behavior, or N/A - confirmed reason>_

**Exception flows / edge cases**:

- `E1`: _<failure, boundary, or recovery behavior, or N/A - confirmed reason>_

**Postconditions**:

- _<observable state or outcome>_

**Errors**:

Each error has a stable semantic identifier (`UPPER_SNAKE_CASE`), no owner, and
the observable behavior it produces. The same identifier may be reused in other
Use Cases when the condition is the same. Keep the wire detail in the contract,
not here.

- `<AREA>_<CONDITION>`: _<when it occurs>_ -> _<observable outcome>_, _<side-effect guarantee>_.

**Acceptance checks**:

Each check must be binary, independently verifiable, sufficiently detailed for
implementation and testing, and stable across updates. Given/When/Then or
Gherkin may be used when it improves clarity, but it is not compulsory. A
negative check references the typed error it expects.

- `AC-01`: _<binary check>_ - Evidence: _<link, test, or TBD>_
- `AC-02`: _<binary check>_ - Evidence: _<link, test, or TBD>_

**Tracking events**:

- `<event_name or N/A - confirmed reason>`: _<trigger or flow step>_,
  channel = _<web/mobile/system or N/A>_, source = _<tracking registry or N/A>_,
  purpose = _<metric or purpose>_, status = _<confirmed / proposed / TBD>_

**Relevant links**:

- Sequence diagram: _<inline Mermaid/PlantUML or link to a repository diagram>_
- Service Blueprint: _<link to the relevant step or N/A - confirmed reason>_
- Figma: _<link to the relevant frame or flow, or N/A - confirmed reason>_
- DR components: _<solution.components.\* IDs from the parent DR/SRS, or N/A - reason>_
- Endpoint / OpenAPI / AsyncAPI / Data Contract: _<contracts.\* ID from the parent DR/SRS, operation ID, path, link, or N/A - reason>_
- Validation evidence: _<test plan, mock, report, or TBD>_

## Open questions and propagation

Questions that are local to this behavior only. Do not repeat a question that
already lives in the parent DR/SRS: reference its `open.item-XX` instead.
Cross-Use-Case or initiative questions belong to the parent document.

| ID           | Type                                          | Item     | Impact / blocker | Owner           | Resolution / link |
| ------------ | --------------------------------------------- | -------- | ---------------- | --------------- | ----------------- |
| `uc-open-01` | _<question / assumption / proposed decision>_ | _<item>_ | _<impact>_       | _<owner / TBD>_ | _<TBD>_           |
