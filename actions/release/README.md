# Release Action

A GitHub Action that automates package versioning and publishing.
This action is package-manager agnostic and works with pnpm, yarn, and npm.

## Features

- 🔄 Automatically creates or updates release pull requests
- 📦 Publishes packages to npm when PRs are merged
- 🔒 Supports npm provenance for enhanced security
- 🎯 Package manager agnostic (pnpm, yarn, npm)
- 🛠️ Customizable version and publish commands
- 📊 Outputs published package information

## Prerequisites

- Your repository must use [Changesets](https://github.com/changesets/changesets) for version management
- A `.changeset/config.json` file configured in your repository
- Changesets CLI added as a dev dependency
- Scripts defined in `package.json` for versioning and publishing (e.g., `version`, `release`)

### Required Permissions

The GitHub token must have the following permissions:

```yaml
permissions:
  contents: write # To push version bumps and tags
  id-token: write # For npm provenance
  pull-requests: write # To create/update release PRs
```

### Package.json Scripts

Your top level `package.json` should include scripts for versioning and publishing:

```json
{
  "scripts": {
    "version": "changeset version",
    "release": "changeset publish"
  }
}
```

#### Example with NX

```json
{
  "scripts": {
    "version": "changeset version && nx run-many --target=version",
    "release": "nx run-many --target=build --projects=tag:npm:public && changeset publish"
  }
}
```

#### Example with Turborepo

```json
{
  "scripts": {
    "version": "changeset version && turbo run version --filter=tag:npm:public",
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
    name: Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
      pull-requests: write
    steps:
      - name: Create Release PR or Publish
        uses: pagopa/dx/actions/release@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### With Custom Commands

```yaml
- name: Create Release PR or Publish
  uses: pagopa/dx/actions/release@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    version-command: "version:packages"
    publish-command: "publish:packages"
```

### With Full Package Manager Command

```yaml
- name: Create Release PR or Publish
  uses: pagopa/dx/actions/release@main
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    npm-token: ${{ secrets.NPM_TOKEN }}
    version-command: "pnpm run version"
    publish-command: "pnpm run release"
```

## Inputs

| Input               | Description                                                            | Required | Default   |
| ------------------- | ---------------------------------------------------------------------- | -------- | --------- |
| `github-token`      | GitHub token with contents:write and pull-requests:write permissions   | Yes      | -         |
| `version-command`   | Command to run for versioning (with or without package manager prefix) | No       | `version` |
| `publish-command`   | Command to run for publishing (with or without package manager prefix) | No       | `release` |
| `working-directory` | Working directory for the action                                       | No       | `.`       |
| `enable-provenance` | Enable npm provenance for published packages (requires npm >=11.5.1)   | No       | `true`    |

## Outputs

| Output              | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `published`         | Whether packages were published (`true`) or a release PR was created (`false`) |
| `publishedPackages` | JSON array of published packages with name and version                         |
| `pullRequestNumber` | The number of the created release PR (if applicable)                           |

## How It Works

1. **Setup**: Detects your package manager (pnpm, yarn, or npm) and sets up Node.js
2. **Install**: Installs dependencies using the detected package manager
3. **npm Update**: Updates npm to support provenance (if enabled)
4. **Version or Publish**:
   - If there are changesets on the default branch, creates/updates a release PR
   - If the release PR is merged, publishes the new versions to npm

## Environment Variables

The action automatically sets:

- `GITHUB_TOKEN`: For creating PRs and pushing commits
- `NPM_CONFIG_PROVENANCE`: Enables npm provenance when publishing (if enabled)

## Troubleshooting

### Release PR is not created

Check that:

1. You have changeset files in the `.changeset` directory
2. The GitHub token has `pull-requests: write` permission
3. You're on the default branch (usually `main`)

### Provenance error

If you see provenance-related errors:

- Ensure you're using an npm version that supports provenance. This action currently installs `npm@11.7.0` automatically when provenance is enabled.
- Verify the `id-token: write` permission is granted
- Check that your npm registry supports provenance

## Related Documentation

- [Changesets Documentation](https://github.com/changesets/changesets)
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
- [Changesets Action](https://github.com/changesets/action)
