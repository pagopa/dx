# DR/SRS operating model

## Document hierarchy

The DR/SRS is the living, operational source of truth for the confirmed
solution and requirements. It is the single dynamic document for verifiable
requirements, Use Cases, and contracts; the PRD is stable once approved. Keep it
linked to, but distinct from:

- the PRD, which owns product need, outcomes, JTBDs, KPIs, and guardrails;
- Service Blueprint and Figma, which own discovery and UX evidence;
- RFCs, which own options, trade-offs, objections, and decision history;
- ADRs, which own code-adjacent implementation decisions;
- OpenAPI, AsyncAPI, Data Contracts, and audit specifications, which own
  technical contract detail;
- Jira, which projects the operational work and validation;
- the Launch Readiness Review, which is a separate Go/No-Go gate artifact,
  linked but not duplicated in the DR/SRS or the PRD.

Link source documents and summarize only the decision or requirement the
DR/SRS must govern, so the DR/SRS stays a summary and not a copy.

## Living-document, baseline, and RFC rule

Update the DR/SRS whenever a material change is accepted, a new Use Case is
identified, or a decision changes expected system behavior.

- Before the baseline is approved, missing, ambiguous, or contradictory content
  is recorded as a gap or an open question, never as a Change Request.
- After the baseline is approved, a Change Request is required only for a
  material change to behavior, scope, or contracts, according to DR-07.
- An RFC with status `accepted` is not sufficient by itself: first propagate its
  decision into the DR/SRS for the impacted slices, record the RFC and
  propagation reference, then treat the updated DR/SRS as the input for backlog
  or implementation work. `rejected` and `superseded` RFCs remain historical and
  must not be applied. Slices that are not impacted may proceed while the
  impacted ones are excluded until propagation.

When updating:

1. Locate the affected section, Use Case index entry, contract, readiness
   criterion, or open decision.
2. Preserve stable IDs and add a new ID only for genuinely new meaning; assign
   the first free ID in scope and never renumber.
3. Record the source RFC/CR/ADR and the propagation date.
4. Remove stale proposed behavior only when the new confirmed behavior replaces
   it; retain a concise decision-history link.
5. Flag downstream Use Case documents, contracts, tests, tracking, and backlog
   that need alignment; edit them only when the user explicitly asks and the
   owning skill handles them.

## Required information discipline

Classify statements as:

- **Confirmed**: directly supported by an authoritative source or explicit user
  decision.
- **Proposed**: a design option still awaiting decision.
- **Assumption**: needed to draft but not verified.
- **Open question**: a missing or conflicting decision that may affect a
  _material dimension_ — scope, behavior, ownership, priority, targets,
  architecture, compliance, contracts, or readiness.
- **N/A**: confirmed not applicable, always with a reason.

Never turn an inferred architecture, target, owner, compliance result, or
operational promise into a confirmed value.

Every material gap carries an owner. A duplicate or an unresolvable identifier
is a `possible-duplicate` or a gap and is never written automatically.

## DR/SRS and Use Cases

The DR/SRS contains only the dynamic view/catalog, link-first:

- stable `UC-XX` ID;
- explicit title;
- source artifact;
- linked `JTBD-XX` when a PRD exists, otherwise `N/A — no linked PRD`;
- `Must` or `Should` priority;
- a link to the child Use Case page;
- lifecycle/status and any missing-content gap.

The Use Case minimum core, required for the DR/SRS readiness gate, is: a stable
`UC-XX` ID, a trigger, a main flow, and at least one binary acceptance check on
the Must Use Cases; the linked JTBD is required only when the PRD exists. The
`uc-engraver` skill owns trigger, preconditions, flows, exception/edge cases,
postconditions, binary acceptance checks, tracking events, and detailed evidence
links. Keep those details in the child pages and link them from the DR/SRS.

## ID namespaces

Use the canonical stable identifiers:

- `UC-XX` for Use Cases;
- `AC-XX` or `AC-UC-XX-YY` for acceptance checks, local to one Use Case;
- `JTBD-XX`, with the `PRD-xxx/JTBD-yy` namespace in cross-document reports;
- `NFR-XX` for cross-cutting non-functional requirements in the
  `Non-functional requirements and compliance` section;
- `RFC-XX` for RFCs;
- `CR-YYYY-NNN` for Change Requests;
- `ADR-XXXX` for repository ADRs;
- `metadata.canonical-outcome-id` for the stable initiative outcome identity.

Dotted IDs such as `outcome.context` or `solution.components.item-001` are
section or field anchors; content entities use the canonical namespaces above.

## Incremental adoption

- For a new initiative, use the complete template and fill every `Always`
  section.
- For a task-centric intake, start from the most granular reliable artifact,
  then complete the DR/SRS `Always` sections and record the missing links. A PRD
  is not required.
- For an in-flight initiative, migrate the minimum viable header/references,
  outcome and scope, solution design, Use Case index, relevant contracts, and
  execution/readiness sections, then complete the remaining gaps progressively.

## Definition of Ready

The DR/SRS is ready for solutioning or backlog generation when:

- the linked PRD has an owner, outcome, JTBD, KPI, and guardrails — or, for a
  direct DR/SRS intake, outcome and scope are in the `Expected outcome` section;
- all `Always` sections are complete, or gaps are explicit;
- relevant conditional blocks are populated or marked `N/A` with reasons;
- each selected Use Case meets the minimum core defined above, or records a gap
  with an owner;
- Figma/Service Blueprint links exist for user-facing work, or a gap is
  recorded;
- privacy, security, accessibility, tracking, and support readiness are
  addressed, justified, or recorded as gaps with an owner; privacy and security
  gaps block the production launch, not the drafting of the document;
- OpenAPI/AsyncAPI/Data Contracts are linked when APIs, events, or data exist,
  or are recorded as explicit gaps with an owner;
- open or accepted RFCs are linked and accepted decisions are propagated for the
  impacted slices;
- `metadata.canonical-outcome-id` is present and stable.

Readiness is evidence-based and may be partial: declared gaps are allowed. A
criterion is ready only when evidence supports it; prose alone leaves it at
`draft`.
