# Nx Release Manager Action

A composite GitHub Action that mirrors [Changesets](https://github.com/changesets/action) behavior for [Nx Release](https://nx.dev/features/manage-releases).

## How It Works

This action automates the Nx release flow in two phases, each triggered by a
dedicated workflow using the `mode` input.

### Phase 1: Create/Update Version Packages PR

**Trigger**: When `.nx/version-plans/**` files are added or modified on the main branch.

> [!TIP]
> To generate version plan files, you can use `npx nx release plan` command in your local environment.
> E.g. `npx nx release plan --projects="@pagopa/package-name" --only-touched=false`

**Actions**:

1. Checks out to `nx-release/main` branch
2. Runs `releaseVersion` + `releaseChangelog` via the Nx Release programmatic API to:
   - Consume version plans
   - Generate or update version bumps in `package.json`/`pom.xml`
   - Generate or update `CHANGELOG.md` files
   - Remove `.nx/version-plans/**` files
3. Commits all changes
4. Creates or updates PR with title `Version Packages`
5. PR body includes release notes extracted directly from Nx changelog output

### Phase 2: Publish Release

**Trigger**: When the `Version Packages` PR (from branch `nx-release/main`) is merged into main.

**Actions**:

1. Builds all public npm packages (`tag:npm:public`)
2. Runs `releasePublish` via the Nx Release programmatic API to publish packages to npm
3. Delegates git tag creation and GitHub release generation to `releaseChangelog` with `createRelease: "github"` — no custom tagging logic
4. Ensures npm provenance is enabled via `NPM_CONFIG_PROVENANCE=true`

## Inputs

| Input            | Description                                                                                               | Default               | Required |
| ---------------- | --------------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| `mode`           | Release mode: `create-pr` to create/update the Version Packages PR, `publish` to publish and create tags | —                     | **true** |
| `github-token`   | GitHub token with `contents:write` and `pull-requests:write` permissions                                  | `${{ github.token }}` | false    |
| `base-branch`    | Base branch where release flow runs                                                                        | `main`                | false    |
| `release-branch` | Branch used for Version Packages PR                                                                        | `nx-release/main`     | false    |
| `pr-title`       | Title for the release pull request                                                                         | `Version Packages`    | false    |
| `commit-message` | Commit message for generated version bumps                                                                 | `Version Packages`    | false    |

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
- `nx.json` must include a `release` section that enables version plans and sets `git.commit: false` / `git.tag: false` (the action manages all git operations):

```json
{
  "release": {
    "versionPlans": true,
    "projectsRelationship": "independent",
    "version": { "updateDependents": "never" },
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
    "git": { "commit": false, "tag": false, "stageChanges": false }
  }
}
```

## Usage in Workflow

The action requires two separate workflows, each with a dedicated trigger.

### Workflow 1 — Create/Update Version Packages PR

Triggered when version plan files are added to main (e.g. after `nx release plan` is run locally and pushed).

```yaml
name: Version Packages

on:
  push:
    branches:
      - main
    paths:
      - .nx/version-plans/**

concurrency: ${{ github.workflow }}-${{ github.ref }}

permissions:
  contents: write
  pull-requests: write

jobs:
  version:
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

      - uses: pagopa/dx/actions/nx-release@<COMMIT_SHA> # replace with the latest SHA
        with:
          mode: create-pr
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Workflow 2 — Publish Release

Triggered when the `Version Packages` PR is merged (identified by the `nx-release/` branch prefix).

```yaml
name: Release

on:
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
    # Only run when the Version Packages PR is merged (not just closed)
    if: >
      github.event.pull_request.merged == true &&
      startsWith(github.event.pull_request.head.ref, 'nx-release/')
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

      - uses: pagopa/dx/actions/nx-release@<COMMIT_SHA> # replace with the latest SHA
        with:
          mode: publish
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Behavior

### Mode: `create-pr`

Invoked when `.nx/version-plans/**` files are added or modified on the base branch.
The action:

1. Checks out a `nx-release/main` branch
2. Runs `releaseVersion` + `releaseChangelog` (via Nx Release programmatic API) to consume
   version plans, update `package.json`/`pom.xml` and `CHANGELOG.md` files, and delete plans
3. Commits all changes and force-pushes the branch
4. Creates or updates a pull request titled `Version Packages`
5. Outputs `pull-request-number` and `pull-request-url`

### Mode: `publish`

Invoked when the Version Packages PR (branch `nx-release/*`) is merged into main.
The action:

1. Builds all public npm packages (`tag:npm:public`)
2. Runs `releasePublish` (via Nx Release programmatic API) to publish packages to npm with provenance
3. Calls `releaseChangelog` with `createRelease: "github"` to create annotated git tags and GitHub
   releases for every successfully published package — using Nx's native implementation
4. Outputs `published: true` when at least one package was published

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
