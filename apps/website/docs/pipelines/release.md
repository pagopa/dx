---
sidebar_position: 5
---

# Automate versioning and publishing

A reusable GitHub workflow that automates package versioning and publishing.
This workflow is package-manager agnostic and works with pnpm, yarn, and npm.

## Features

- 🔄 Automatically creates or updates release pull requests
- 📦 Publishes packages to npm when PRs are merged
- 🔒 Mandatory npm provenance for enhanced security
- 🎯 Package manager agnostic (pnpm, yarn, npm)
- 🛠️ Customizable version and publish commands
- 📊 Outputs published package information

## Prerequisites

- Your repository must use
  [Changesets](https://github.com/changesets/changesets) for version management
- A `.changeset/config.json` file configured in your repository
- Changesets CLI added as a dev dependency
- Scripts defined in `package.json` for versioning and publishing (e.g.,
  `version`, `release`)

### Required Permissions

The workflow runs with the following permissions:

```yaml
permissions:
  contents: write # To push version bumps and tags
  id-token: write # For npm provenance (trusted publishing)
  pull-requests: write # To create/update release PRs
```

:::info

This workflow uses npm's
[trusted publishing](https://docs.npmjs.com/generating-provenance-statements)
with provenance, which eliminates the need for npm tokens.

:::

### Package.json Scripts

Your top level `package.json` should include scripts for versioning and
publishing:

#### Example with NX and pnpm

```json
{
  "scripts": {
    "version": "changeset version && pnpm i --lockfile-only && nx run-many --target=version",
    "release": "nx run-many --target=build --projects=tag:npm:public && changeset publish"
  }
}
```

#### Example with Turborepo and Yarn

```json
{
  "scripts": {
    "version": "changeset version && yarn --mode update-lockfile && turbo run version --filter=tag:npm:public",
    "release": "turbo run build --filter=tag:npm:public && changeset publish"
  }
}
```

## Usage

### Basic Usage

```yaml
name: Release

on:
  push:
    branches:
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    uses: pagopa/dx/.github/workflows/release-v1.yaml@main
    with:
      environment: npm-prod-cd
    secrets:
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

### With Custom Commands

```yaml
jobs:
  release:
    uses: pagopa/dx/.github/workflows/release-v1.yaml@main
    with:
      environment: npm-prod-cd
      version-command: "version:packages"
      publish-command: "publish:packages"
    secrets:
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

### With Full Package Manager Command

```yaml
jobs:
  release:
    uses: pagopa/dx/.github/workflows/release-v1.yaml@main
    with:
      environment: npm-prod-cd
      version-command: "pnpm run version"
      publish-command: "pnpm run release"
    secrets:
      github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input               | Description                                                            | Required | Default   |
| ------------------- | ---------------------------------------------------------------------- | -------- | --------- |
| `environment`       | Environment to deploy to (e.g., `npm-prod-cd`)                         | Yes      | -         |
| `version-command`   | Command to run for versioning (with or without package manager prefix) | No       | `version` |
| `publish-command`   | Command to run for publishing (with or without package manager prefix) | No       | `release` |
| `working-directory` | Working directory for the action                                       | No       | `.`       |

## Secrets

| Secret         | Description                                                          | Required |
| -------------- | -------------------------------------------------------------------- | -------- |
| `github-token` | GitHub token with contents:write and pull-requests:write permissions | Yes      |

## Outputs

| Output              | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `published`         | Whether packages were published (`true`) or a release PR was created (`false`) |
| `publishedPackages` | JSON array of published packages with name and version                         |
| `pullRequestNumber` | The number of the created release PR (if applicable)                           |

## How It Works

1. **Setup**: Detects your package manager (pnpm, yarn, or npm) and sets up
   Node.js
2. **Install**: Installs dependencies using the detected package manager
3. **npm Update**: Updates npm to version 11.8.0 to support provenance
4. **Version or Publish**:
   - If there are changesets on the default branch, creates/updates a release PR
   - If the release PR is merged, publishes the new versions to npm with
     provenance

## Environment Variables

The workflow automatically sets:

- `GITHUB_TOKEN`: For creating PRs and pushing commits (passed as secret)
- `NPM_CONFIG_PROVENANCE`: Always set to `true` to enable npm provenance

:::info

No npm token is required. The workflow uses npm's trusted publishing feature
with OpenID Connect (OIDC) tokens for authentication.

:::

## Troubleshooting

### Release PR is not created

Check that:

1. You have changeset files in the `.changeset` directory
2. The GitHub token has `pull-requests: write` permission
3. You're on the default branch (usually `main`)

### Provenance error

If you see provenance-related errors:

- Ensure you're using an npm version that supports provenance. Minimum version
  is `11.5.1`.
- Verify the `id-token: write` permission is granted
- Check that your npm registry supports provenance

## Related Documentation

- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [Changesets Action](https://github.com/changesets/action)
