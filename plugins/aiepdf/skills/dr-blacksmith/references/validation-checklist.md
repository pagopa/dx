# DR/SRS validation checklist

Apply this checklist before changing `metadata.status`. The Definition of Ready
in [`dr-srs-model.md`](./dr-srs-model.md) is the single normative source for the
review and backlog gates; this checklist is the operational form of the
structural and traceability requirements around them. Where a check restates a
criterion, the model wins.

## Structure and traceability

- [ ] The document follows `templates/design-review.md` and its section labels.
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

- [ ] The Use Case catalog is link-first: stable `UC-XX` IDs and titles, each
      linked to its child page, with no status, priority, or behavior detail
      duplicated from the child.
- [ ] Every `ready` child names the `solution.components.*` and `contracts.*`
      entries it touches, or a justified `N/A`.
- [ ] `ready` children meet the minimum core defined in `dr-srs-model.md`; other
      children stay `draft` with an owner gap.
- [ ] Detailed triggers, flows, exceptions, postconditions, acceptance checks,
      and tracking events live on the child page, owned by the dedicated Use
      Case skill.

## Lifecycle and change propagation

- [ ] Pre-baseline missing, ambiguous, or contradictory content is recorded as a
      gap or open question, not a Change Request.
- [ ] Post-baseline material changes to behavior, scope, or contracts are
      recorded as a Change Request with propagation to the affected contracts,
      Use Cases, tests, and backlog. Detail added inside the agreed scope is a
      normal update, not a Change Request.
- [ ] A new Use Case takes the next free `UC-XX` ID without renumbering; a
      changed Use Case that already has tracker items is flagged for
      synchronization.

## Delivery readiness

- [ ] The review gate and the backlog gate in `dr-srs-model.md` are assessed
      separately, each with linked evidence rather than prose.
- [ ] At least one Use Case page may be `ready` while the document stays
      `draft`; document gaps do not block ready Use Cases.
- [ ] Material unresolved blockers are visible with an owner and expected
      resolution; non-blocking gaps are marked as partial readiness.

## Finalization

- [ ] Unresolved template placeholders have been replaced with confirmed
      information, explicit assumptions, open questions, or justified N/A values.
- [ ] Stable English IDs and machine-facing values are preserved.
