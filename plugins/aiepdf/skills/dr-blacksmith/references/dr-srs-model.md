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
- Jira and other trackers, which project the operational work and validation;
- the Launch Readiness Review, which is a separate Go/No-Go gate artifact,
  linked but not duplicated in the DR/SRS or the PRD.

Link source documents and summarize only the decision or requirement the
DR/SRS must govern, so the DR/SRS stays a summary and not a copy.

Within the DR/SRS, the `Domain model and glossary` section owns the solution
vocabulary — entities, states, invariants, and shared terms — as a description,
never as schema or code, and without per-item identifiers. Typed errors are not
centralized: each Use Case page owns the errors of its own behavior, using
stable semantic identifiers, and an error carries no owner.

## Living-document, baseline, and change propagation

Update the DR/SRS whenever a material change is accepted, a new Use Case is
identified, or a decision changes expected system behavior.

- Before the baseline is approved, missing, ambiguous, or contradictory content
  is recorded as a gap or an open question, never as a Change Request.
- After the baseline is approved, a Change Request is required only for a
  material change to behavior, scope, or contracts. A material change is one
  that alters observable system behavior, the agreed scope, or a contract other
  teams depend on. Adding detail to an existing Use Case, or adding a new Use
  Case inside the agreed scope, is a normal update, not a Change Request.
- Record a Change Request with its `CR-YYYY-NNN` ID, the affected artifacts, and
  the propagation to contracts, Use Cases, tests, and the backlog.
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

## Use Case status

Each Use Case lives on its own page and carries one status: `draft` or `ready`.
The page owns the status; the parent DR/SRS catalog does not repeat it. The
status is a human decision: a skill proposes `ready` with evidence and never
promotes the page on its own.

- `draft`: identified and being detailed, not yet ready to slice.
- `ready`: see "Backlog readiness" section for the criteria that must be met before a Use Case can be considered ready.

A new Use Case takes the next free `UC-XX` ID and does not renumber existing
entries. Raising one Use Case to `ready` does not force the rest of the document
to be ready, and the parent catalog stays a minimal ID, title, and link list.
Where tracker items already exist, their stable source ID maps them back to the
Use Case; a change is handled by the tracker's own synchronization, not by a
status stored in the DR/SRS.

## Required information discipline

Classify statements as:

- **Confirmed**: directly supported by an authoritative source or explicit user
  decision.
- **Proposed**: a design option still awaiting decision.
- **Assumption**: needed to draft but not verified.
- **Open question**: a missing or conflicting decision that may affect a
  _material dimension_ — scope, behavior, domain, data, ownership, priority,
  targets, architecture, compliance, contracts, or readiness.
- **N/A**: confirmed not applicable, always with a reason.

Never turn an inferred architecture, target, owner, compliance result, or
operational promise into a confirmed value.

Every material gap carries an owner. A duplicate or an unresolvable identifier
is a `possible-duplicate` or a gap and is never written automatically.

## DR/SRS and Use Cases

The DR/SRS contains only the dynamic view/catalog, link-first:

- stable `UC-XX` ID;
- explicit title (in most cases the user story);
- a link to the child Use Case page.

Everything else lives on the child page: status, priority, source artifact,
linked JTBD, actors, components, contracts, trigger, flows, and acceptance
checks. The child names the parent DR/SRS `solution.components.*` and
`contracts.*` entries it touches, so a backlog agent maps a Use Case to its
technical surface without the catalog duplicating it. It also names the domain
entities it touches by name (no identifiers) and defines its own typed errors
with semantic identifiers, reusing the same identifier across Use Cases when the
condition is the same instead of restating it.

Open questions live at the right level and are never duplicated: questions that
affect several Use Cases or the initiative belong to the DR/SRS
(`open.item-XX`); questions local to one behavior belong to that Use Case page
(`uc-open-XX`). A page that repeats a DR/SRS question by text is non-conformant
and must reference it instead.

The Use Case minimum core, required for `ready`, is: a stable `UC-XX` ID, a
trigger, a main flow, and at least one binary acceptance check on the Must Use
Cases; the linked JTBD is required only when the PRD exists. The `uc-engraver`
skill owns trigger, preconditions, flows, exception/edge cases, postconditions,
binary acceptance checks, tracking events, and detailed evidence links. Keep
those details in the child pages and link them from the DR/SRS.

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

Dotted IDs such as `outcome.context`, `solution.components.item-001`, or
`contracts.item-001` are section or field anchors; content entities use the
canonical namespaces above.

Two categories deliberately have no canonical numeric namespace:

- **Domain model and glossary.** Entities, states, invariants, and terms are
  referenced by name, without identifiers.
- **Typed errors.** Each Use Case defines its errors with stable semantic
  identifiers in `UPPER_SNAKE_CASE` (for example
  `AGREEMENT_EXTENSION_INVALID`). These are local to behaviors, not a
  centralized catalogue, and the same identifier may legitimately appear in
  different Use Cases when the condition is the same.

## Incremental adoption

- For a new initiative, use the complete template and fill every `Always`
  section.
- For a task-centric intake, start from the most granular reliable artifact,
  then complete the DR/SRS `Always` sections and record the missing links. A PRD
  is not required.
- For an in-flight initiative, migrate the minimum viable header/references,
  outcome and scope, solution design, Use Case index, relevant contracts, and
  execution/readiness sections, then complete the remaining gaps progressively.
- Handoff can start before the document is complete: project the Use Cases that
  are `ready` and keep the remaining gaps visible.

## Definition of Ready

Readiness is evidence-based and may be partial: declared gaps are allowed. A
criterion is ready only when evidence supports it; prose alone leaves it
unready. The two gates below are independent, and this section is their single
normative source.

### Review readiness (document-level)

The DR/SRS is ready for review when:

- the linked PRD has an owner, outcome, JTBD, KPI, and guardrails — or, for a
  direct DR/SRS intake, outcome and scope are in the `Expected outcome` section;
- all `Always` sections are complete, or gaps are explicit; an `Always` section
  may be `N/A — <confirmed reason>` when it is genuinely inapplicable, but it
  must be present;
- the `Domain model and glossary` section describes entities, relations, states,
  invariants, and terms, or records `N/A — <confirmed reason>`; it never carries
  identifiers;
- the technology profile lists the high-level, Technology-Radar-informed choices
  (CSP, language, runtime, managed cloud services, architecture style, contract
  format) and does not embed day-to-day development tooling, which reaches the
  coding agent as separate context;
- the deployment view shows the real cloud services and the trust boundaries,
  not IaC, pipeline, or SKU-level detail; the repository is a link;
- relevant conditional blocks are populated or marked `N/A` with reasons;
- each selected Use Case meets the minimum core or records a gap with an owner;
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

Only this gate moves `metadata.status` from `draft` to `review` or `baseline`.

### Backlog readiness (per-Use-Case)

A Use Case page is `ready` when:

- it has a stable `UC-XX` ID, a title, a `Must` or `Should` priority, and a
  source artifact;
- it supplies a trigger, a main flow, and at least one binary acceptance check
  on Must Use Cases;
- it names the `solution.components.*` and `contracts.*` entries it touches, or
  a justified `N/A`;
- it names the domain entities it touches and defines its typed errors with
  semantic identifiers, or records a justified `N/A`;
- its remaining gaps carry an owner, and no open question repeats a DR/SRS one.

Backlog generation consumes only `ready` pages and does not require the document
review gate. A gap that blocks one Use Case keeps that page `draft`; it does not
block the others.
