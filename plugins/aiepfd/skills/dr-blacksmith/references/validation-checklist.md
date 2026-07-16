# DR/SRS validation checklist

Apply this checklist before changing `metadata.status` or handing the document
off for Confluence publication.

## Structure and traceability

- [ ] The document follows `templates/design-review.md`.
- [ ] Every stable section and field ID is present and unchanged.
- [ ] Confirmed statements cite or name their source.
- [ ] Proposed designs, assumptions, open questions, and decisions are clearly
      distinguished.
- [ ] Relevant conditional sections are populated or use
      `N/A — <confirmed reason>`.

## Design and contracts

- [ ] Context, outcome, scope, non-goals, constraints, and ownership are clear
      enough for the requested lifecycle state.
- [ ] Solution boundaries, components, dependencies, and deployment assumptions
      are internally consistent.
- [ ] Relevant non-functional requirements and compliance concerns have targets,
      evidence, owners, or explicit gaps.
- [ ] Relevant APIs, events, data contracts, integrations, and audit behavior are
      linked or explicitly unresolved.
- [ ] Accepted RFC decisions are reflected in the DR/SRS before they guide
      implementation.

## Use Case boundary

- [ ] The Use Case catalog has stable `UC-XX` IDs, titles, linked JTBDs,
      priorities, and lifecycle status or explicit gaps.
- [ ] Detailed triggers, flows, exceptions, postconditions, acceptance checks,
      and tracking events are delegated to the dedicated Use Case skill.
- [ ] The DR/SRS does not require duplicated child-page URLs.

## Delivery readiness

- [ ] Rollout, rollback, validation, monitoring, and operational readiness are
      addressed or explicitly unresolved.
- [ ] Definition of Ready evidence reflects actual linked artifacts or decisions,
      not prose alone.
- [ ] Material unresolved blockers are visible with an owner and expected
      resolution.

## Publication handoff

- [ ] Authoring guidance and unresolved template placeholders have been removed
      or converted into explicit gaps.
- [ ] Stable English IDs remain unchanged even when visible content is
      translated.
- [ ] The user explicitly confirmed publication before invoking
      `confluence-librarian`.
