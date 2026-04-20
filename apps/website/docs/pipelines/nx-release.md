---
sidebar_position: 11
---

# Automate versioning and publishing with Nx

A reusable GitHub workflow that automates package versioning and publishing for
[Nx](https://nx.dev) monorepos using
[Nx Release](https://nx.dev/features/manage-releases) with version plans.

## Features

- 💬 Posts a managed summary comment on pull requests that include version plans
- 🔄 Automatically creates or updates a `Version Packages` pull request when new
  version plans are added
- 📦 Publishes packages to npm when the `Version Packages` PR is merged
- 🎯 Agnostic: Works with pnpm, yarn, and npm
- ♻️ Idempotent: `workflow_dispatch` can recover missed tags or releases

## How It Works

The workflow automates the full release lifecycle in three steps:

1. **When a pull request includes version plan files** — the workflow can post a
   managed comment that summarizes the detected packages, bump types, and the
   latest PR head SHA.
2. **When you push a version plan to `main`** — the workflow opens (or updates)
   a `Version Packages` pull request that bumps versions and updates changelogs
   automatically.
3. **When the `Version Packages` PR is merged** — the workflow publishes the
   packages to npm with provenance, creates git tags, and creates the
   corresponding GitHub Releases.

:::tip Recovery

If something goes wrong mid-publish, re-run the action or trigger
`workflow_dispatch` manually. The workflow will pick up from where it left off,
creating only the missing tags and releases.

:::

## Prerequisites

- Repository configured with `nx.json` (see
  [nx.json configuration](#nxjson-configuration) below)
- npm packages require
  [OIDC Trusted Publishing](https://docs.npmjs.com/generating-provenance-statements)
  configured (`id-token: write` permission must be granted)
- Public packages must be tagged as public in their Nx project configuration.
  The `nx-release` workflow treats any tag equal to `public` or ending with
  `:public` (for example, `npm:public`) as publishable.

### Marking a package as public

To mark a package as public, set `"private": false` in the package's
`package.json` file. This is necessary for the publish workflow to process the
package:

```json
{
  "name": "@pagopa/my-package",
  "version": "1.0.0",
  "private": false,
  ... other package.json fields
}
```

### nx.json configuration

Add the following `release` block to your `nx.json`:

```json
{
  "release": {
    "versionPlans": true,
    "projects": [
      "apps/*",
      "packages/*",
      ... other project globs
    ],
    "projectsRelationship": "independent",
    "version": {},
    "changelog": {
      "projectChangelogs": {
        "createRelease": false,
        "file": "{projectRoot}/CHANGELOG.md",
        "renderOptions": {
          "authors": true,
          "applyUsernameToAuthors": true,
          "commitReferences": true,
          "versionTitleDate": true
        }
      }
    },
    "git": {
      "commit": false,
      "tag": true,
      "stageChanges": false
    },
    "releaseTag": {
      "pattern": "{projectName}@{version}"
    }
  }
}
```

| Option                 | Value                        | Why                                                                                                                                                                                                      |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `versionPlans`         | `true`                       | Enables file-based versioning via [version plans](../github/pull-requests/version-plan.md): version increments are described in dedicated files committed to the repo                                    |
| `projects`             | `["projects_path_1/*", ...]` | Glob patterns matching all projects to include in the release process; required for Nx to discover and release all packages                                                                              |
| `projectsRelationship` | `"independent"`              | Each package has its own version; there is no single workspace-wide version                                                                                                                              |
| `createRelease`        | `false`                      | GitHub Releases are created automatically by the workflow after the PR is merged, not at changelog generation time                                                                                       |
| `git.commit`           | `false`                      | The workflow handles commits itself; letting Nx commit would interfere with the PR creation logic                                                                                                        |
| `git.tag`              | `true`                       | Nx creates tags locally so the workflow can reference them; they are pushed only after the PR is merged                                                                                                  |
| `releaseTag.pattern`   | `{projectName}@{version}`    | Follows the [default Nx independent release convention](https://nx.dev/docs/guides/nx-release/release-projects-independently#create-a-git-tag-for-each-project); defining it explicitly improves clarity |

:::note

The key `renderOptions` just adds some extra details to the changelog, but it
doesn't affect the release process. You can omit it if you don't need those
details (refer to the
[Nx documentation](https://nx.dev/docs/guides/nx-release/configure-changelog-format)).

:::

## Usage

Use the `release-v2.yaml` reusable workflow. Create a
`.github/workflows/release.yaml` file:

```yaml
name: Release

on:
  pull_request:
    branches:
      - main
    types:
      - opened
      - reopened
      - synchronize
    paths:
      - ".nx/version-plans/**"
  push:
    branches:
      - main
    paths:
      - ".nx/version-plans/**"
  workflow_dispatch:

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Nx Release
    permissions:
      contents: write
      id-token: write
      pull-requests: write
    uses: pagopa/dx/.github/workflows/release-v2.yaml@main
    with:
      environment: npm-prod-cd
    secrets:
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

The `pull_request` trigger is optional but recommended when you want a managed
summary comment on feature PRs. The reusable workflow keeps that path light: it
checks out the PR head and lets `nx-release` auto-detect the PR summary case,
without installing dependencies.

## Inputs

| Input         | Description                                              | Required | Default       |
| ------------- | -------------------------------------------------------- | -------- | ------------- |
| `environment` | Repository Environment to associate with the release job | Yes      | `app-prod-cd` |

## Secrets

| Secret         | Description                                                              | Required |
| -------------- | ------------------------------------------------------------------------ | -------- |
| `github-token` | GitHub token with `contents:write` and `pull-requests:write` permissions | Yes      |

## Required Permissions

```yaml
permissions:
  contents: write # To push version bumps, tags, and commits
  id-token: write # For npm provenance (trusted publishing)
  pull-requests: write # To create/update the Version Packages PR
```

## Starting a Release

A release starts by committing a **version plan** to `main`. A version plan is a
small file that records which packages changed and how their version should be
bumped.

## Pull Request Summary

When the same reusable workflow is also triggered on `pull_request`, it scans
the active `.nx/version-plans/**` files in the PR and posts a managed comment.
The comment includes:

- the latest PR head SHA
- the unique packages detected across all version plans
- the highest bump type per package when duplicates exist
- a details section listing the source version plan files

The comment is updated in place on `synchronize` and removed automatically when
the PR no longer contains active version plan files. The auto-generated
`Version Packages` PR is excluded.

### 1. Generate the version plan

From the root of the repository, run:

```bash
npx nx release plan
```

The command is interactive: it will ask which packages to include and what bump
type to apply (_patch_ / _minor_ / _major_ / _prerelease_ / _prepatch_ /
_preminor_ / _premajor_). At the end it writes a file under
`.nx/version-plans/`.

> For more details see the
> [Nx version plans documentation](https://nx.dev/docs/guides/nx-release/file-based-versioning-version-plans).

### 2. Commit and push

```bash
git add .nx/version-plans/
git commit -m "feat: update @pagopa/my-package"
git push origin main
```

Pushing to `main` triggers the workflow, which opens (or updates) the
`Version Packages` PR automatically. Merging that PR publishes the packages.

:::info

The direct push to `main` is a simplified flow for demonstration purposes. In a
real-world scenario, you might want to create a PR for the version plan changes
as well.

:::

## Troubleshooting

### Version Packages PR is not created

- Ensure `.nx/version-plans/` contains version plan files on `main`
- Verify the GitHub token has `pull-requests: write` permission
- Run `nx release --dry-run` locally to check for errors

### PR summary comment is not created

- Ensure the caller workflow includes a `pull_request` trigger
- Ensure the PR diff still contains active `.nx/version-plans/**` files

### Publish fails

- Verify that packages have the `npm:public` tag in their Nx configuration
- Check that OIDC trusted publishing is configured on npm
- Ensure `id-token: write` permission is granted to the workflow

### Git tags or GitHub Releases are missing

Trigger `workflow_dispatch` manually. The action scans all past merged
`Version Packages` PRs and creates any tags and releases still missing.

## Related Documentation

- [Nx Release Documentation](https://nx.dev/features/manage-releases)
- [Nx Release Plan](https://nx.dev/docs/guides/nx-release/file-based-versioning-version-plans)
- [Nx Commands](https://nx.dev/docs/reference/nx-commands)
