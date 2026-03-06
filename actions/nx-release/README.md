# Nx Release Manager Action

A composite GitHub Action that mirrors [Changesets](https://github.com/changesets/action) behavior for [Nx Release](https://nx.dev/features/manage-releases).

## How It Works

This action automates the Nx release flow in two phases:

### Phase 1: Create/Update Version Packages PR

**Trigger**: When `.nx/version-plans/**` files are added or modified on the main branch.

> [!TIP]
> To generate version plan files, you can use `npx nx release plan` command in your local environment.
> E.g. `npx nx release plan --projects="@pagopa/package-name" --only-touched=false`

**Actions**:

1. Detects new or modified version plan files by github events
2. Checks out to `nx-release/main` branch
3. Runs `npx nx release --skip-publish` to:
   - Consume version plans
   - Generate or update version bumps in `package.json`/`pom.xml`
   - Generate or update `CHANGELOG.md` files
   - Remove `.nx/version-plans/**` files
4. Commits all changes
5. Creates or updates PR with title `Version Packages`
6. PR body includes extracted release notes from changelogs

### Phase 2: Publish Release

**Trigger**: When version plan files are deleted and version bumps are detected on main (PR merge).

**Actions**:

1. Runs `npx nx release publish` to:
   - Create git tags and github release for each package
   - Build and publish packages to npm
   - Ensure npm provenance is enabled

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
- Node.js and pnpm/npm installed
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
2. Runs `npx nx release --skip-publish` to consume version plans and update
   `package.json`/`pom.xml` and `CHANGELOG.md` files
3. Commits all changes and force-pushes the branch
4. Creates or updates a pull request titled `Version Packages`
5. Outputs `pull-request-number` and `pull-request-url`

### Mode: `Publish`

Version plan files were **deleted** and version bumps were detected (i.e. the
`Version Packages` PR was merged). The action:

1. Builds all public npm packages (`tag:npm:public`)
2. Runs `npx nx release publish` with npm provenance enabled
3. Creates annotated git tags for each newly published version
4. Pushes all tags to origin
5. Creates a GitHub release per tag with extracted changelog notes
6. Outputs the list of created tags via `tags`

## Compatibility

- ✅ Idempotent: re-running on the same commit handles deduplication
- ✅ Supports monorepos with multiple packages
- ✅ npm provenance enabled by default

## Troubleshooting

### PR not created

- Ensure `.nx/version-plans/` directory exists
- Verify `gh` CLI has authentication; check GITHUB_TOKEN is set
- Check that version plans produce actual version changes (run `nx release --dry-run`)

### Publish fails

- Verify npm token is available (or OIDC/provenance is configured)
- Check that packages are public on npm registry
- Ensure `NPM_CONFIG_PROVENANCE=true` is set in workflow

### Duplicate PRs or releases

- Re-run workflow on the same commit should detect and skip
- If issues persist, manually review branch `nx-release/main` and tags

---

## See Also

- [Nx Release Documentation](https://nx.dev/features/manage-releases)
- [Changesets Action](https://github.com/changesets/action)
- [GitHub Workflow Reference](https://docs.github.com/en/actions)
