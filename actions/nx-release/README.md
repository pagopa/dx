# Nx Release Manager Action

A composite GitHub Action that mirrors [Changesets](https://github.com/changesets/action) behavior for [Nx Release](https://nx.dev/features/manage-releases).

## How It Works

This action automates the Nx release flow in two phases:

### Phase 1: Create/Update Version Packages PR

**Trigger**: When `.nx/version-plans/**` files are added or modified on the main branch.

> [!TIP]
> To generate version plan files, you can use `nx release plan` command in your local environment.
> E.g. `nx release plan --projects="@pagopa/package-name" --only-touched=false`

**Actions**:

1. Detects new or modified version plan files by github events
2. Checks out to `nx-release/main` branch
3. Runs `nx release --skip-publish` to:
   - Consume version plans
   - Generate or update version bumps in `package.json`/`pom.xml`
   - Generate or update `CHANGELOG.md` files
   - Remove `.nx/version-plans/**` files
   - Create git tags **locally** (not pushed yet)
4. Captures the exact tags Nx created (via snapshot diff before/after) and embeds them
   as a hidden `<!-- nx-release-tags: [...] -->` comment in the PR body
5. Commits all changes
6. Creates or updates PR with title `Version Packages`
7. PR body includes extracted release notes from changelogs

### Phase 2: Publish and Sync

**Trigger**: When the `Version Packages` PR is merged (or manually via `workflow_dispatch`).

**Actions**:

1. Runs `nx release publish` to build and publish packages to npm with provenance
2. Reads the `<!-- nx-release-tags -->` metadata from **all** past merged `Version Packages` PRs
3. Creates any missing annotated git tags and pushes them
4. Creates any missing GitHub Releases with extracted changelog notes

> [!TIP]
> `workflow_dispatch` can be used to recover from failed runs: the sync step scans all
> past merged PRs and creates only the tags and releases that are still missing.

## Inputs

| Input          | Description                                                              | Default               | Required |
| -------------- | ------------------------------------------------------------------------ | --------------------- | -------- |
| `github-token` | GitHub token with `contents:write` and `pull-requests:write` permissions | `${{ github.token }}` | false    |
| `base-branch`  | Base branch where release flow runs                                      | `main`                | false    |

## Outputs

| Output                | Description                                    |
| --------------------- | ---------------------------------------------- |
| `pull-request-number` | PR number created/updated for Version Packages |
| `pull-request-url`    | PR URL created/updated for Version Packages    |

## Prerequisites

- Repository configured with `nx.json` (Nx monorepo)
- `gh` CLI available in the runner
- GitHub token with appropriate permissions
- npm packages require [OIDC Trusted Publishing](https://docs.npmjs.com/generating-provenance-statements) configured to enable provenance signing (`id-token: write` permission must be granted)

## Usage in Workflow

```yaml
name: Release

on:
  # Needed for the push github event to trigger the action when version plans are added/modified
  push:
    branches:
      - main
    paths:
      - ".nx/version-plans/**"
  # Needed for the pull_request github event to trigger the action when Version Packages PR is merged
  pull_request:
    types:
      - closed
    branches:
      - main
  # Can be triggered manually to recover any git tags/GitHub Releases missed by a failed publish
  workflow_dispatch:

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  id-token: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          fetch-depth: 0
          fetch-tags: "true"

      - uses: actions/setup-node@1e60f620b9541d16bece96c5465dc8ee9832be0b # v4.0.3
        with:
          node-version: "20"

      - run: corepack enable && corepack prepare pnpm@10.30.0 --activate
      - run: pnpm install --frozen-lockfile

      - uses: pagopa/dx/actions/nx-release@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Behavior

The action runs in one of two modes, determined automatically by github event type.

### Mode: `Create PR`

One or more `.nx/version-plans/**` files were **added or modified** on the base
branch. The action:

1. Checks out a `nx-release/main` branch
2. Runs `nx release --skip-publish` to consume version plans and update
   `package.json`/`pom.xml` and `CHANGELOG.md` files
3. Captures the git tags created locally by Nx (snapshot diff before/after)
4. Commits all changes and force-pushes the branch
5. Creates or updates a pull request titled `Version Packages` with a
   hidden `<!-- nx-release-tags: [...] -->` metadata comment in the body
6. Outputs `pull-request-number` and `pull-request-url`

### Mode: `Publish`

The `Version Packages` PR was **merged** (or `workflow_dispatch` was triggered). The action:

1. Builds all public npm packages (`tag:npm:public`)
2. Runs `nx release publish` with npm provenance enabled
3. Reads the `<!-- nx-release-tags -->` metadata from all past merged PRs,
   creates any missing annotated git tags, and pushes them
4. Creates a GitHub Release per new tag with extracted changelog notes;
   pre-release builds (versions containing `-`) are marked as pre-releases

## Compatibility

- ✅ Idempotent: re-running on the same commit handles deduplication
- ✅ Supports monorepos with multiple packages
- ✅ npm provenance enabled by default
- ✅ Compatible with custom `releaseTagPattern` in `nx.json` (tag matching does not
  assume a specific separator between package name and version)

## Troubleshooting

### PR not created

- Ensure `.nx/version-plans/` directory exists
- Verify `gh` CLI has authentication; check GITHUB_TOKEN is set
- Check that version plans produce actual version changes (run `nx release --dry-run`)

### Publish fails

- Verify npm token is available (or OIDC/provenance is configured)
- Check that packages are public on npm registry
- Ensure `NPM_CONFIG_PROVENANCE=true` is set in workflow

### Git tags or GitHub Releases missing after publish

- Trigger `workflow_dispatch` on the release workflow; the Sync step will scan all
  past merged `Version Packages` PRs and create any tags and releases still missing.
- If a PR body lacks the `<!-- nx-release-tags -->` comment, re-run the Create PR
  step on the `nx-release/main` branch to regenerate it.

---

## See Also

- [Nx Release Documentation](https://nx.dev/features/manage-releases)
- [Changesets Action](https://github.com/changesets/action)
- [GitHub Workflow Reference](https://docs.github.com/en/actions)
