---
sidebar_position: 11
---

# Automate versioning, publishing, and deployments with Nx

:::info Reusable Workflows

| Workflow                             | Version | Source                                                                                          |
| ------------------------------------ | ------- | ----------------------------------------------------------------------------------------------- |
| **Validate** (PR version-plan check) | v1      | [`validate-v1.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/validate-v1.yaml) |
| **Release** (publish and deploy)     | v2      | [`release-v2.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/release-v2.yaml)   |

:::

A reusable GitHub workflow that automates package versioning, publishing, and
approval-gated Terraform environment deployments for [Nx](https://nx.dev)
monorepos using [Nx Release](https://nx.dev/features/manage-releases) with
version plans.

## Features

- ⚠️ Can show a pull request warning when changes need a version plan but none
  is present
- 🔄 Automatically creates or updates a `Version Packages` pull request when new
  version plans are pushed to `main`
- 📦 Publishes packages to npm when the `Version Packages` PR is merged
- 🌍 Dispatches one independent plan/approval/apply workflow for each released
  Terraform environment
- 🎯 Agnostic: Works with pnpm, yarn, and npm
- ♻️ Idempotent: `workflow_dispatch` can recover missed tags or releases

## How It Works

The workflow automates the release lifecycle in two steps:

1. **When you push a version plan to `main`** — the workflow opens (or updates)
   a `Version Packages` pull request that bumps versions and updates changelogs
   automatically.
2. **When the `Version Packages` PR is merged** — the workflow publishes the
   packages to npm with provenance, creates git tags and GitHub Releases, and
   dispatches one independent deployment workflow for each released Terraform
   environment. Package publishing completes without waiting for infrastructure
   approvals.

If you also enable the DX validation workflow, pull requests can receive a
warning comment when the changes look releasable but the PR does not include a
matching version plan.

:::tip Recovery

If package publishing or tag synchronization fails, re-run the action or trigger
`workflow_dispatch` manually. Terraform deployments run separately: re-run the
failed environment workflow, or manually dispatch it with the same project and
source commit.

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

Terraform environment releases additionally require:

- an `environment.json` manifest and the inferred `tf-plan-upload` and
  `nx-release-publish` targets;
- a workflow in the caller repository that accepts the Terraform deployment
  inputs. DX uses `release-terraform-environment-v1.yaml`;
- paired plan/apply GitHub environments, with required reviewers configured on
  the apply environment;
- self-hosted runners and cloud credentials available through those
  environments.

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
      actions: write
      contents: write
      id-token: write
      pull-requests: write
    uses: pagopa/dx/.github/workflows/release-v2.yaml@main
    with:
      environment: npm-prod-cd
      terraform-deployment-workflow: release-terraform-environment-v1.yaml
    secrets:
      app-client-id: ${{ secrets.GH_APP_RELEASE_CLIENT_ID }}
      app-private-key: ${{ secrets.GH_APP_RELEASE_APP_KEY }}
```

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
      pull-requests: write
    uses: pagopa/dx/.github/workflows/validate-v1.yaml@main
```

With this in place, pull requests receive a warning only when a version plan is
missing or incomplete.

## Inputs

| Input                           | Description                                                    | Required | Default                                 |
| ------------------------------- | -------------------------------------------------------------- | -------- | --------------------------------------- |
| `environment`                   | Repository Environment associated with the package release job | Yes      | `app-prod-cd`                           |
| `terraform-deployment-workflow` | Workflow file that deploys one released Terraform environment  | No       | `release-terraform-environment-v1.yaml` |

## Secrets

| Secret            | Description            | Required |
| ----------------- | ---------------------- | -------- |
| `app-client-id`   | GitHub App client ID   | Yes      |
| `app-private-key` | GitHub App private key | Yes      |

## Required Permissions

```yaml
permissions:
  actions: write # To dispatch independent Terraform deployment workflows
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
`Version Packages` PR automatically. Merging that PR publishes packages and
dispatches released Terraform environments without waiting for their approval
gates.

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

### Terraform deployment is not dispatched

- Ensure the release caller grants `actions: write`
- Ensure `terraform-deployment-workflow` names a workflow file in the caller
  repository
- Check that the Version Packages PR contains valid `nx-release-tags` metadata
- Verify that the released project has a valid `environment.json`

### Terraform deployment fails or is rejected

Re-run the independent environment workflow. For recovery outside the original
run, dispatch `release-terraform-environment-v1.yaml` manually with the released
project, source commit, GitHub environment names, and runner label.

### Git tags or GitHub Releases are missing

Trigger `workflow_dispatch` manually. The action scans all past merged
`Version Packages` PRs and creates any tags and releases still missing.

## Related Documentation

- [Nx Release Documentation](https://nx.dev/features/manage-releases)
- [Nx Release Plan](https://nx.dev/docs/guides/nx-release/file-based-versioning-version-plans)
- [Nx Commands](https://nx.dev/docs/reference/nx-commands)
