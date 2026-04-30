# Nx Release Manager Action

A composite GitHub Action that mirrors [Changesets](https://github.com/changesets/action) behavior for [Nx Release](https://nx.dev/features/manage-releases).

In DX repositories, the validation workflow invokes this action on pull
requests to manage version plan coverage warnings.

## How It Works

This action automates the Nx release flow in three phases:

### Phase 0: Warn on Missing Version Plan Coverage in Pull Requests

**Trigger**: On `pull_request`, when the action is invoked by the validation workflow.

**Actions**:

1. Reads the pull request context from the GitHub event payload
2. Computes affected Nx projects with `nx show projects --affected`
3. Reads the changed `.nx/version-plans/**` files from the checked-out PR head
4. Matches coverage against both Nx project names and `metadata.js.packageName` values when available
5. Creates, updates, or deletes the managed PR warning comment idempotently
6. Skips the auto-generated `Version Packages` PR to avoid noisy self-comments

### Phase 1: Create/Update Version Packages PR

**Trigger**: On push to `main`, when `.nx/version-plans/**` changed and the directory still contains one or more files.

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
   - Create git tags **locally** (not pushed yet)
4. Captures the exact tags Nx created (via snapshot diff before/after) and embeds them
   as a hidden `<!-- nx-release-tags: [...] -->` comment in the PR body
5. Commits all changes
6. Creates or updates PR with title `Version Packages`
7. PR body includes extracted release notes from changelogs

### Phase 2: Publish and Sync

**Trigger**: On push to `main`, when `.nx/version-plans/**` changed and the directory contains zero files. Or manually via `workflow_dispatch` for recovery.

**Actions**:

1. Extracts projects to publish from the latest merged `Version Packages` PR (or builds all public projects when triggered via `workflow_dispatch`)
2. Runs `npx nx release publish` with provenance enabled
3. Reads the `<!-- nx-release-tags -->` metadata from **all** past merged `Version Packages` PRs
4. Creates any missing annotated git tags and pushes them
5. Creates any missing GitHub Releases with extracted changelog notes

> [!TIP]
> `workflow_dispatch` can be used to recover from failed runs: it builds and publishes all public projects
> and the Sync step scans all past merged PRs to create any missing tags and releases.

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
  push:
    branches:
      - main
    paths:
      - ".nx/version-plans/**"
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

The action runs in one of four modes, all determined automatically from the event context and changes in `.nx/version-plans/**`.

### Mode: `Warn PR`

Used automatically on `pull_request` workflows. The action:

1. Computes affected Nx projects from the PR context
2. Reads the changed version plan files from the checked-out branch
3. Upserts a managed warning comment only when affected projects are missing coverage
4. Deletes the warning comment when coverage becomes complete
5. Skips the managed `Version Packages` PR

### Mode: `Create PR`

`.nx/version-plans/**` changed in the push and the directory still contains one or more files. The action:

1. Checks out a `nx-release/main` branch
2. Runs `npx nx release --skip-publish` to consume version plans and update
   `package.json`/`pom.xml` and `CHANGELOG.md` files
3. Captures the git tags created locally by Nx (snapshot diff before/after)
4. Commits all changes and force-pushes the branch
5. Creates or updates a pull request titled `Version Packages` with a
   hidden `<!-- nx-release-tags: [...] -->` metadata comment in the body
6. Outputs `pull-request-number` and `pull-request-url`

### Mode: `Publish` (push)

`.nx/version-plans/**` changed in the push and the directory contains zero files. The action:

1. Finds the latest merged `Version Packages` PR and extracts the list of released projects
2. Builds and publishes only those projects (falls back to all public if no PR is found)
3. Reads the `<!-- nx-release-tags -->` metadata from all past merged PRs,
   creates any missing annotated git tags, and pushes them
4. Creates a GitHub Release per new tag with extracted changelog notes;
   pre-release builds (versions containing `-`) are marked as pre-releases

### Mode: `Publish All` (workflow_dispatch)

Triggered manually. The action:

1. Builds and publishes **all** public projects (`tag:*:public`)
2. Reads the `<!-- nx-release-tags -->` metadata from all past merged PRs,
   creates any missing annotated git tags, and pushes them
3. Creates any missing GitHub Releases with extracted changelog notes

## Compatibility

- ✅ Idempotent: re-running on the same commit handles deduplication
- ✅ Supports monorepos with multiple packages
- ✅ NPM provenance enabled by default
- ✅ Compatible with custom `releaseTagPattern` in `nx.json` (tag matching does not
  assume a specific separator between package name and version)

## Troubleshooting

### PR not created

- Ensure `.nx/version-plans/` directory exists
- Verify `gh` CLI has authentication; check GITHUB_TOKEN is set
- Check that version plans produce actual version changes (run `npx nx release --dry-run`)

### PR warning comment is missing

- Ensure the repository validation workflow invokes this action on `pull_request`
- Ensure the job checks out the repository before calling the local action
- Ensure the PR affects Nx projects and that uncovered projects are not already declared in the changed `.nx/version-plans/**` files

### Publish fails

- Verify registry credentials are available (or OIDC/provenance is configured)
- Check that released packages are configured for publication
- Ensure `NPM_CONFIG_PROVENANCE=true` is set in workflow when needed

### Git tags or GitHub Releases missing after publish

- Trigger `workflow_dispatch` on the release workflow; it builds and publishes all public projects
  and the Sync step scans all past merged `Version Packages` PRs to create any missing tags and releases.
- If a PR body lacks the `<!-- nx-release-tags -->` comment, re-run the Create PR
  step on the `nx-release/main` branch to regenerate it.

---

## See Also

- [Nx Release Documentation](https://nx.dev/features/manage-releases)
- [Changesets Action](https://github.com/changesets/action)
- [GitHub Workflow Reference](https://docs.github.com/en/actions)
