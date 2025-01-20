# 8. We use changesets for releases

Date: 2025-01-19

## Status

Accepted

## Context

We need an automated and reliable way to release our software using semantic
versioning and keep our changelog up-to-date. Additionally, we need a way to
individually version packages within the monorepo.

We evaluated two popular options:
[Changesets](https://github.com/changesets/changesets) and
[@semantic-release](https://github.com/semantic-release/semantic-release). Both
tools offer automated versioning, changelog generation, and publishing
capabilities, but they differ in their approach and flexibility.

## Decision

We have decided to adopt Changesets over @semantic-release for the following
reasons:

1. Manual Control with Flexibility

Changesets allow our team to manually define version updates through changeset
files within pull requests. This provides greater control over the versioning
process and enables developers to carefully decide the impact of changes (major,
minor, patch) without relying on commit message conventions.

2. Better Collaboration Workflow

Changesets fit well within our existing pull request workflow, allowing
discussions and reviews of proposed version changes. This approach ensures that
version increments are well thought out and approved by the team before being
applied.

3. Less Strict Commit Message Requirements

Unlike @semantic-release, which enforces strict adherence to the Conventional
Commits specification, Changesets allow our team to maintain flexibility in
commit message styles without compromising versioning accuracy.

4. Monorepo Support

With multiple packages in our repository, Changesets provide a better structure
for managing versioning across individual packages, allowing independent or
grouped releases with ease.

## Consequences

Positive:

- Increased visibility and control over versioning decisions.
- Easier adoption by the team without enforcing commit conventions.
- Seamless integration with our PR review process.

Negative:

- Requires manual intervention to create changeset files.
- Slightly longer versioning process compared to full automation.

## Conclusion

Changesets strike a balance between automation and control, making it the best
fit for our team's workflow and project requirements.
