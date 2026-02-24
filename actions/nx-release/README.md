# Nx Release Manager Action

A composite GitHub Action that mirrors [Changesets](https://github.com/changesets/action) behavior for [Nx Release](https://nx.dev/features/manage-releases).

## How It Works

This action automates the Nx release flow in two phases:

### Phase 1: Create/Update Version Packages PR

**Trigger**: When `.nx/version-plans/**` files are added or modified on the main branch.

**Actions**:
1. Detects new or modified version plan files
2. Checks out to `changeset-release/main` branch
3. Runs `nx release version --no-commit` to:
   - Consume version plans
   - Generate or update version bumps in `package.json`/`pom.xml`
   - Generate or update `CHANGELOG.md` files
   - Remove `.nx/version-plans/**` files
4. Commits all changes with message `chore: version packages`
5. Creates or updates PR with title `chore: Release (Version Packages)`
6. PR body includes extracted release notes from changelogs

### Phase 2: Publish Release

**Trigger**: When version plan files are deleted and version bumps are detected on main (PR merge).

**Actions**:
1. Runs `npx nx release publish --yes` to:
   - Build and publish packages to npm
   - Create git tags for each package
   - Ensure npm provenance is enabled

## Inputs

| Input | Description | Default | Required |
| --- | --- | --- | --- |
| `github-token` | GitHub token with `contents:write` and `pull-requests:write` permissions | `${{ github.token }}` | false |
| `base-branch` | Base branch where release flow runs | `main` | false |
| `release-branch` | Branch used for Version Packages PR | `changeset-release/main` | false |
| `pr-title` | Title for the release pull request | `chore: Release (Version Packages)` | false |
| `commit-message` | Commit message for generated version bumps | `chore: version packages` | false |

## Outputs

| Output | Description |
| --- | --- |
| `mode` | Detected mode: `create-pr`, `publish`, or `noop` |
| `pull-request-number` | PR number created/updated for Version Packages |
| `pull-request-url` | PR URL created/updated for Version Packages |
| `published` | Whether publish command ran successfully (`true` or `false`) |

## Prerequisites

- Repository configured with `nx.json` (Nx monorepo)
- Node.js and pnpm/npm installed
- `gh` CLI available in the runner
- GitHub token with appropriate permissions

## Usage in Workflow

```yaml
name: Release

on:
  push:
    branches:
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  id-token: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          fetch-tags: "true"

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: corepack enable && corepack prepare pnpm@10.30.0 --activate
      - run: pnpm install --frozen-lockfile

      - uses: pagopa/dx/.github/actions/nx-release@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_CONFIG_PROVENANCE: true
```

## Behavior

### When version plans are pushed

1. Action detects added/modified `.nx/version-plans/**` files
2. Executes `nx release version --no-commit`
3. Creates or updates PR on `changeset-release/main` with all changes:
   - Version bumps
   - Changelog entries
   - Consumed version plans (deleted)

### When PR is merged

1. Action detects consumed version plans + version bumps
2. Executes `nx release publish`
3. Publishes packages to npm with git tags

### No action needed

If no version plans or no version changes are detected, action exits cleanly with mode `noop`.

## Compatibility

- ✅ Works alongside Changesets (Changesets takes priority if both are configured)
- ✅ Idempotent: re-running on the same commit handles deduplication
- ✅ Supports monorepos with multiple packages
- ✅ npm provenance enabled by default

## Troubleshooting

### PR not created

- Ensure `.nx/version-plans/` directory exists
- Verify `gh` CLI has authentication; check GITHUB_TOKEN is set
- Check that version plans produce actual version changes (run `nx release version --dry-run`)

### Publish fails

- Verify npm token is available (or OIDC/provenance is configured)
- Check that packages are public on npm registry
- Ensure `NPM_CONFIG_PROVENANCE=true` is set in workflow

### Duplicate PRs or releases

- Re-run workflow on the same commit should detect and skip
- If issues persist, manually review branch `changeset-release/main` and tags

---

## See Also

- [Nx Release Documentation](https://nx.dev/features/manage-releases)
- [Changesets Action](https://github.com/changesets/action)
- [GitHub Workflow Reference](https://docs.github.com/en/actions)
