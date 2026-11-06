---
id: UC-16
status: draft
priority: Must
parent_dr: ../design-review.md
---

# `UC-16`: Version and publish reusable assets

**Linked JTBD**: N/A — no applicable PRD; direct DR intake.

**Primary actor**: Shared asset maintainer.

**Secondary actors**: Reviewers, delivery automation and consuming teams.

**Source artifact**: [Release process](../../actions/nx-release/README.md) and [tooling lifecycle](../../apps/website/docs/tooling-lifecycle.mdx).

**Service Blueprint step**: [SB-05 Validate, release and publish](../service-blueprint.md#sb-05-validate-release-and-publish).

**Domain entities**: Team, Workspace, Change and validation result, Service and release, Knowledge artifact.

**Trigger**: A maintainer changes a shared asset that needs a new published version.

**Preconditions**:

- The asset and its release configuration exist.
- The maintainer can propose the change and the publishing identity has the required authority.
- A contract-breaking change is planned for a new major version with a documented migration path; current enforcement remains unverified in parent `open.item-005`.

**Main flow**:

1. The maintainer records the intended version change and release notes.
2. The release capability prepares the version changes for review.
3. Reviewers approve and integrate the prepared release according to the configured policy.
4. Delivery automation publishes applicable versioned assets and records release information.
5. Consumers can inspect the published version and lifecycle guidance.

**Alternate flows**:

- `A1`: A validation run warns when a change lacks version-plan coverage; the documented warning is not itself a universal blocking gate.
- `A2`: A supported recovery run reconciles missing publication metadata after an interrupted release.

**Exception flows / edge cases**:

- `E1`: Publishing or release synchronization fails -> Error: `ASSET_PUBLICATION_FAILED`.
- `E2`: A configured approval is missing -> Error: `APPROVAL_REQUIRED`.

**Postconditions**:

- Successful publication produces the applicable versioned asset and release information.
- A failed publication is not proof that all earlier release actions were reversed; see parent `open.item-007`.

**Errors**:

- `ASSET_PUBLICATION_FAILED`: Publishing or release synchronization fails -> the failure is reported and the maintainer can inspect or recover the release.
- `APPROVAL_REQUIRED`: A configured release approval has not been granted -> the protected release step remains pending.

**Acceptance checks**:

- `AC-01`: A documented release flow prepares version updates and release notes before the corresponding assets are published. Evidence: [release process](../../actions/nx-release/README.md).
- `AC-02`: Missing version-plan coverage produces a warning in the documented validation path; it is not described as an unconditional block. Evidence: [release process](../../actions/nx-release/README.md).
- `AC-03`: The documented recovery flow can reconcile missing release metadata after `ASSET_PUBLICATION_FAILED`. Evidence: [release process](../../actions/nx-release/README.md).
- `AC-04`: An incompatible contract change is assigned a new major version and accompanied by a documented migration path. Evidence: [agreed compatibility policy](../design-review.md#solution-design); enforcement verification remains in `open.item-005`.
- `AC-05`: Each shared capability declares its supported major versions and communicates end of support and migration guidance, without a uniform minimum support period. Evidence: [agreed lifecycle policy](../design-review.md#solution-design); per-capability evidence remains in `open.item-005`.

**Tracking events**: Not established; see parent `open.item-003`.

**Relevant links**:

- Sequence diagram:

  ```mermaid
  sequenceDiagram
      actor Maintainer
      participant Release as Release capability
      actor Reviewer
      participant Catalog as Published asset catalog
      Maintainer->>Release: Record version intent
      Release-->>Reviewer: Prepared version change
      Reviewer->>Release: Approve configured release
      Release->>Catalog: Publish applicable assets
      Release-->>Maintainer: Publication outcome
  ```

- Service Blueprint: [SB-05 Validate, release and publish](../service-blueprint.md#sb-05-validate-release-and-publish).
- Design discovery: N/A — no other applicable design-discovery source, confirmed in the parent.
- DR components: `solution.components.item-005`, `solution.components.item-011`.
- Interface / data contract: `contracts.item-006`, `contracts.item-012`.
- Validation evidence: [release process](../../actions/nx-release/README.md).

## Open questions and propagation

Cross-asset compatibility and recovery guarantees are tracked in parent
`open.item-001`, `open.item-005` and `open.item-007`. No additional
behavior-local question has been identified.
