# DR/SRS validation checklist

Apply this checklist before changing `metadata.status`. It is the operational
form of the Definition of Ready in
[`dr-srs-model.md`](./dr-srs-model.md), plus the structural and traceability
gates. The Definition of Ready stays normative: where a check restates it, the
model wins.

## Structure and traceability

- [ ] The document follows `templates/design-review.md`.
- [ ] Every stable section and field ID is present and unchanged.
- [ ] `metadata.canonical-outcome-id` is present and stable.
- [ ] Content entities use the canonical namespaces (`UC-XX`, `AC-UC-XX-YY`,
      `NFR-XX`, `JTBD-XX`, `RFC-XX`, `CR-YYYY-NNN`).
- [ ] Confirmed statements cite or name their source.
- [ ] Confirmed facts, proposed design, assumptions, open questions, and
      decisions are separated.
- [ ] Relevant conditional sections are populated or use
      `N/A — <confirmed reason>`.
- [ ] Every material gap carries an owner.
- [ ] Duplicate or unresolvable identifiers become a
      `possible-duplicate`/gap and wait for a human decision before any write.

## Design and contracts

- [ ] Context, outcome, scope, non-goals, constraints, and ownership are clear
      enough for the requested lifecycle state.
- [ ] The solution design includes the technology profile (CSP/language
      preferences, Technology Radar outcome or an explicit gap).
- [ ] Solution boundaries, components, dependencies, and deployment assumptions
      are internally consistent.
- [ ] Relevant non-functional requirements and compliance concerns have targets,
      evidence, owners, or explicit gaps.
- [ ] Relevant APIs, events, data contracts, integrations, and audit behavior are
      linked or explicitly unresolved.
- [ ] Accepted RFC decisions are reflected in the DR/SRS for the impacted slices
      before they guide implementation.

## Use Case boundary

- [ ] The Use Case catalog has stable `UC-XX` IDs, titles, source artifacts,
      linked JTBDs (or `N/A — no linked PRD`), priorities, and lifecycle status
      or explicit gaps.
- [ ] Each catalog row links the child Use Case page; the DR/SRS links child
      pages without copying their content.
- [ ] Each selected Use Case meets the minimum core or records an owner gap (see
      the Definition of Ready in `dr-srs-model.md`).
- [ ] Detailed triggers, flows, exceptions, postconditions, acceptance checks,
      and tracking events live in the dedicated Use Case skill.

## Lifecycle and change propagation

- [ ] Pre-baseline missing, ambiguous, or contradictory content is recorded as a
      gap or open question, not a Change Request.
- [ ] Post-baseline material changes are recorded as a Change Request per DR-07
      with propagation to the affected contracts, Use Cases, and tests.

## Delivery readiness

- [ ] Every Definition of Ready criterion in `dr-srs-model.md` passes with
      linked evidence, not prose alone.
- [ ] Material unresolved blockers are visible with an owner and expected
      resolution.
- [ ] Non-blocking gaps are marked as partial readiness.

## Finalization

- [ ] Unresolved template placeholders have been replaced with confirmed
      information, explicit assumptions, open questions, or justified N/A values.
- [ ] Stable English IDs and machine-facing values are preserved.
