---
sidebar_position: 3
---

# Changeset

This document provides guidelines on how to create and manage changesets, which
are used to document and track changes in the codebase. Proper use of changesets
ensures that all modifications are recorded systematically, facilitating the
tracking and auditing of changes over time.

## Create a Changeset

There are multiple ways to create a changeset file:

- Follow the
  [official Changesets guide](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md).
- [Enable the Changeset bot](https://github.com/apps/changeset-bot) in your
  repository and interact with it on pull requests. The bot will add a comment
  to each PR, summarizing whether it includes a changeset or not. If it doesn’t,
  you can create one directly through the GitHub UI.

## Breaking Changes

When the code added in a PR breaks backward compatibility, a migration path or
guide must be included in the changeset with a `major` update. This ensures that
users can transition smoothly to the new version without disruption.

### Example

```markdown
---
"dx-website": major
---

Upgrade to Turbo 2.x

## Migration guide

First, check the
[official documentation](https://turbo.build/repo/docs/crafting-your-repository/upgrading)
for any doubts.

- Run `yarn dlx @turbo/codemod migrate` or `npx @turbo/codemod migrate`
  (official tool that should help to migrate. Follow the wizard)
  - This will update the `turbo.json` file and try to install the latest version
    of `turbo`
    - In case of errors, you can manually update the `turbo.json` file
      [following these steps](https://turbo.build/repo/docs/reference/turbo-codemod#turborepo-2x)
    - In case it wasn't possible to install `turbo`, try to do it manually:
      - `yarn add -D turbo`
    - Now you should be ready to use the latest version of `turbo`
- Eventually, update the workflow pointing to a specific SHA
```

## Monorepo

When working with a monorepo, it is essential to manage changesets properly to
ensure that all changes are documented and versioned correctly.  
If you make changes on multiple workspaces, you should create a changeset for
each workspace to maintain a clear and organized history of modifications.

### Example

```markdown
---
"dx-website": patch
---

Fix typo in documentation
```

```markdown
---
"package-A": minor
---

Update version of dependency `package-B` to `1.2.0`
```

Both changesets should be included in the same PR if they relate to the same
feature or fix and require separate changelogs for the two packages.
