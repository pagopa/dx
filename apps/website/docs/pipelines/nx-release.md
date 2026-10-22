---
sidebar_position: 11
---

# Automate versioning and publishing with Nx

:::info Reusable Workflows

| Workflow                             | Version | Source                                                                                          |
| ------------------------------------ | ------- | ----------------------------------------------------------------------------------------------- |
| **Validate** (PR version-plan check) | v1      | [`validate-v1.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/validate-v1.yaml) |
| **Release** (publish to npm)         | v2      | [`release-v2.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/release-v2.yaml)   |

:::

A reusable GitHub workflow that automates package versioning and publishing for
[Nx](https://nx.dev) monorepos using
[Nx Release](https://nx.dev/features/manage-releases) with version plans.

:::tip Publishing Docker images too?

If your Nx repository also publishes Docker images, see
[Release Docker images with the Nx Docker plugin](../containers/nx-docker-release.md)
for setup and tag strategy details.

:::

## Features

- ⚠️ Can show a pull request warning when changes need a version plan but none
  is present
- 🔄 Automatically creates or updates a `Version Packages` pull request when new
  version plans are pushed to `main`
- 📦 Publishes packages to npm when the `Version Packages` PR is merged
- 🎯 Agnostic: Works with pnpm, yarn, and npm
- ♻️ Idempotent: `workflow_dispatch` can recover missed tags or releases

## How It Works

The workflow automates the release lifecycle in two steps:

1. **When you push a version plan to `main`** — the workflow opens (or updates)
   a `Version Packages` pull request that bumps versions and updates changelogs
   automatically.
2. **When the `Version Packages` PR is merged** — the workflow publishes the
   packages to npm with provenance, creates git tags, and creates the
   corresponding GitHub Releases.

If you also enable the DX validation workflow, pull requests can receive a
warning comment when the changes look releasable but the PR does not include a
matching version plan.

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
- A GitHub App installed on the repository with **Contents: Read and write**
  and **Pull requests: Read and write** permissions. Store its Client ID in
  `GH_APP_CLIENT_ID` and its private key in `GH_APP_KEY`. The same pair can
  authenticate Terraform's GitHub provider in `validate-v2.yaml`; a second App
  is not required for releases.

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
      # The release job installs the repository dependencies and publishes the
      # DX packages, both through GitHub Packages.
      packages: write
      pull-requests: write
    uses: pagopa/dx/.github/workflows/release-v2.yaml@main
    with:
      environment: npm-prod-cd
    secrets: inherit
```

To pass only the required App credentials instead of inheriting secrets, use:

```yaml
secrets:
  GH_APP_CLIENT_ID: ${{ secrets.GH_APP_CLIENT_ID }}
  GH_APP_KEY: ${{ secrets.GH_APP_KEY }}
```

### Optional: use a dedicated release App

Most repositories only need the standard pair above. If releases need a
different App, pass its credentials through the existing `app-client-id` and
`app-private-key` secrets:

```yaml
secrets:
  GH_APP_CLIENT_ID: ${{ secrets.GH_APP_CLIENT_ID }}
  GH_APP_KEY: ${{ secrets.GH_APP_KEY }}
  app-client-id: ${{ secrets.GH_APP_RELEASE_CLIENT_ID }}
  app-private-key: ${{ secrets.GH_APP_RELEASE_APP_KEY }}
```

The release-specific pair takes precedence when configured. Supply both override
values or neither; an incomplete override fails rather than mixing credentials
from different Apps. Existing callers that pass only `app-client-id` and
`app-private-key` continue to work unchanged.

For cross-organization Terraform publishing, install the release App on both the
source repository and the destination organization. The workflow uses its source
installation token for release operations and forwards the same App credentials
so the Terraform publisher can mint a separate destination installation token.
DX uses this override to publish modules to `pagopa-dx`.

:::info[GitHub Packages permissions]

The calling job must grant `packages: write` so the workflow can both install
dependencies hosted on GitHub Packages and publish the release. A reusable
workflow can only downgrade the permissions granted by its caller: a
`permissions` block without `packages` sets the scope to `none`. The call is not
rejected upfront; the install fails later, when the registry refuses the token
with `401`.

The setup step authenticates npm and pnpm through an npmrc. Yarn 2+ (Berry)
ignores that file, so a Yarn Berry repository must configure the `pagopa` scope
in `.yarnrc.yml` itself.

:::

### Optional: enable the pull request warning

If you also want a warning comment on pull requests, add a validation workflow
that uses `validate-v1.yaml`:

```yaml
name: Validate

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  validate:
    permissions:
      contents: read
      actions: read
      packages: read
      pull-requests: write
    uses: pagopa/dx/.github/workflows/validate-v1.yaml@main
```

With this in place, pull requests receive a warning only when a version plan is
missing or incomplete.

## Inputs

| Input         | Description                                              | Required | Default       |
| ------------- | -------------------------------------------------------- | -------- | ------------- |
| `environment` | Repository Environment to associate with the release job | Yes      | `app-prod-cd` |

## Secrets

| Secret             | Description                                                                  | Required                    |
| ------------------ | ---------------------------------------------------------------------------- | --------------------------- |
| `GH_APP_CLIENT_ID` | Standard App Client ID, shared with validation                               | Unless an override is used  |
| `GH_APP_KEY`       | Standard App private key, shared with validation                             | Unless an override is used  |
| `app-client-id`    | Release-specific App Client ID; overrides the standard pair                  | Only with `app-private-key` |
| `app-private-key`  | Release-specific App private key; retained for existing caller compatibility | Only with `app-client-id`   |

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

## Pull Request Warning

When the optional validation workflow is enabled, a pull request can receive a
warning comment if it changes something that should have a version plan but does
not include one.

To clear the warning, add or fix the files in `.nx/version-plans/` and push the
update. The comment is refreshed automatically and disappears when everything is
covered.

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

### PR warning comment is not created

- Ensure the validation workflow runs on `pull_request`
- Ensure the PR really needs a version plan
- Ensure the PR includes the correct files in `.nx/version-plans/`
- The warning is only managed on same-repository pull requests

### Publish fails

- Verify that packages have the `npm:public` tag in their Nx configuration
- Check that OIDC trusted publishing is configured on npm
- Ensure `id-token: write` permission is granted to the workflow

### Git tags or GitHub Releases are missing

Trigger `workflow_dispatch` manually. The action scans all past merged
`Version Packages` PRs and creates any tags and releases still missing.

## Related Documentation

- [Release Docker images with the Nx Docker plugin](../containers/nx-docker-release.md)
- [Nx Release Documentation](https://nx.dev/features/manage-releases)
- [Nx Release Plan](https://nx.dev/docs/guides/nx-release/file-based-versioning-version-plans)
- [Nx Commands](https://nx.dev/docs/reference/nx-commands)
