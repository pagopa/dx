# DR/SRS operating model

## Document hierarchy

The DR/SRS is the operational source of truth for the confirmed solution and
requirements. Keep it linked to, but distinct from:

- the PRD, which owns product need, outcomes, JTBD, KPIs, and guardrails;
- Service Blueprint and Figma, which own discovery and UX evidence;
- RFCs, which own options, trade-offs, objections, and decision history;
- ADRs, which own code-adjacent implementation decisions;
- OpenAPI, AsyncAPI, Data Contracts, and audit specifications, which own
  technical contract detail;
- Jira, which projects the operational work and validation.

The `jira-magister` skill owns the Jira projection workflow: Epic slicing,
actor-facing Stories, technical Tasks, confirmation, synchronization, and
verification. Jira remains downstream of the DR/SRS and must not become a
requirements source.

Do not copy whole source documents into the DR/SRS. Link them and summarize
only the decision or requirement the DR/SRS needs to govern.

## Living-document and RFC rule

Update the DR/SRS whenever a material change is accepted, a new Use Case is
identified, or a decision changes expected system behavior. An RFC with status
`accepted` is not sufficient by itself: first propagate its decision into the
DR/SRS, record the RFC and propagation reference, then treat the updated DR/SRS
as the input for backlog or implementation work. `rejected` and `superseded`
RFCs remain historical and must not be applied.

When updating:

1. Locate the affected section, Use Case index entry, contract, readiness
   criterion, or open decision.
2. Preserve stable IDs and add a new ID only for genuinely new meaning.
3. Record the source RFC/CR/ADR and the propagation date.
4. Remove stale proposed behavior only when the new confirmed behavior replaces
   it; retain a concise decision-history link.
5. Flag downstream Use Case documents, contracts, tests, tracking, and backlog
   that need alignment. Do not edit those artifacts unless the user explicitly
   asks for it and the relevant skill owns them.

## Required information discipline

Classify statements as:

- **Confirmed**: directly supported by an authoritative source or explicit
  user decision.
- **Proposed**: a design option still awaiting decision.
- **Assumption**: needed to draft but not verified.
- **Open question**: a missing or conflicting decision that may affect scope,
  behavior, ownership, compliance, contracts, or readiness.
- **N/A**: confirmed not applicable, always with a reason.

Never turn an inferred architecture, target, owner, compliance result, or
operational promise into a confirmed value.

## DR/SRS and Use Cases

The DR/SRS contains only the dynamic view/catalog:

- stable `UC-XX` ID;
- explicit title;
- linked `JTBD-XX` when applicable;
- `Must` or `Should` priority;
- lifecycle/status and any missing-content gap.

The `uc-engraver` skill owns trigger, preconditions, main and alternate flows,
exception/edge cases, postconditions, binary acceptance checks, tracking
events, and detailed evidence links. Do not duplicate those details in the
DR/SRS.

## Incremental adoption

- For a new initiative, use the complete template and fill every
  `Always` section.
- For a task-centric intake, start from the most granular reliable artifact,
  then complete the DR/SRS `Always` sections and record the missing links.
- For an in-flight initiative, migrate the minimum viable header/references,
  outcome and scope, solution design, Use Case index, relevant contracts, and
  execution/readiness sections, then complete the remaining gaps progressively.

## Definition of Ready

The DR/SRS is ready for solutioning or backlog generation when:

- the linked PRD has an owner, outcome, JTBD, KPI, and guardrails;
- all `Always` sections are complete;
- relevant conditional sections are populated or marked `N/A` with reasons;
- Use Cases have stable IDs, priorities, linked JTBDs, and lifecycle status or
  explicit handoff gaps;
- Figma/Service Blueprint links exist for user-facing work;
- privacy, security, accessibility, tracking, and support readiness are
  addressed or justified;
- OpenAPI/AsyncAPI/Data Contracts are linked when APIs, events, or data exist;
- open or accepted RFCs are linked and accepted decisions are propagated;
- the delivery projection has an outcome and at least one qualitative
  guardrail.

Readiness is evidence-based. Do not mark a criterion ready merely because a
section contains prose.
