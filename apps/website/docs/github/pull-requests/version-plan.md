---
sidebar_position: 3
---

# Version Plan

This document provides guidelines on how to create and manage version plans,
which are used to document and track changes in the codebase. Version plans are
the primary mechanism in this repository for versioning packages and generating
changelogs, powered by [Nx Release](https://nx.dev/features/manage-releases).

## Prerequisite: nx.json configuration

Version plans are read by Nx Release only when they are enabled in `nx.json`. At
minimum, configure the `release` block like this:

```json
{
  "release": {
    "versionPlans": true,
    "projectsRelationship": "independent"
  }
}
```

In our DX repositories, we always set `projectsRelationship` to `"independent"`
so each project is versioned separately.

For a complete configuration example, see
[Automate versioning and publishing with Nx](../../pipelines/nx-release.md#nxjson-configuration).

## Create a Version Plan

Run the following command from the root of the repository:

```bash
pnpm nx release plan
```

The command is interactive: it asks you to select which packages to include and
what bump type to apply (_patch_ / _minor_ / _major_ / _prerelease_ / _prepatch_
/ _preminor_ / _premajor_). At the end it writes a file under
`.nx/version-plans/`.

Alternatively, you can create the file manually — see the
[Nx version plans documentation](https://nx.dev/docs/guides/nx-release/file-based-versioning-version-plans).

When you later run `pnpm nx release`, Nx uses the files in `.nx/version-plans/`
as the source of truth for version bumps.

## Pull Request Warning Comment

If your repository enables the DX validation workflow, pull requests can show a
warning comment when a version plan is missing or incomplete.

In that case run `pnpm nx release plan` early in the development process, so the
version plan is included in the pull request and reviewers can see the intended
version bump and release notes.

## Breaking Changes

When the code added in a PR breaks backward compatibility, a migration path or
guide must be included in the version plan with a `major` bump. This ensures
that users can transition smoothly to the new version without disruption.

### Example

````markdown
---
"@pagopa/my-package": major
---

Remove deprecated `foo` option

## Migration guide

The `foo` option has been removed. Replace it with `bar`:

```diff
- myLib({ foo: true })
+ myLib({ bar: "value" })
```
````

## Monorepo

In generic Nx monorepos, a single version plan file can describe bumps for
multiple packages.

In DX, we standardize on `projectsRelationship: "independent"` and keep version
plans focused on a single project. This keeps each release intent small, clear,
and easy to review.

### Example

```markdown
---
"@pagopa/package-a": minor
---

Add support for feature X
```

If more projects need to be released, create additional version plan files (one
per project) in the same PR.

:::note

If your repository uses Changesets instead of Nx Release, refer to the
[Changeset guide](./changeset.md) for the equivalent workflow.

:::
