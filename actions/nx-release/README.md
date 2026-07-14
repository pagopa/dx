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

1. Extracts projects to publish and released Terraform environment metadata from the latest merged `Version Packages` PR (or builds all public projects when triggered via `workflow_dispatch`); invalid or incomplete release metadata fails the publish instead of silently skipping infrastructure
2. Runs `npx nx release publish` with provenance enabled
3. Reads the `<!-- nx-release-tags -->` metadata from **all** past merged `Version Packages` PRs
4. Creates any missing annotated git tags and pushes them
5. Creates any missing GitHub Releases with extracted changelog notes

> [!TIP]
> `workflow_dispatch` can be used to recover from failed runs: it builds and publishes all public projects
> and the Sync step scans all past merged PRs to create any missing tags and releases.

## Inputs

| Input          | Description                                    | Default | Required |
| -------------- | ---------------------------------------------- | ------- | -------- |
| `github-token` | Pre-generated GitHub App installation token    |         | true     |
| `app-slug`     | GitHub App slug associated with `github-token` |         | true     |
| `base-branch`  | Base branch where release flow runs            | `main`  | false    |

## Outputs

| Output                        | Description                                                                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pull-request-number`         | PR number created/updated for Version Packages                                                                                                                                                                                    |
| `pull-request-url`            | PR URL created/updated for Version Packages                                                                                                                                                                                       |
| `release-mode`                | Resolved release mode for this run: `skip`, `create-pr`, `publish`, or `publish-all`                                                                                                                                              |
| `published-pr-number`         | PR number of the merged Version Packages PR whose projects were published in this run. Only set when `release-mode` is `publish` (empty for `publish-all`, which republishes all public projects rather than a single merged PR). |
| `released-environment-matrix` | JSON matrix of released Terraform environments, including the Nx project and resolved plan/apply environment and runner metadata. Values default from the project directory and can be overridden in `environment.json`.          |

`release-v2.yaml` consumes `released-environment-matrix` by dispatching one
independent Terraform deployment workflow run per environment. Package
publishing therefore does not remain blocked while infrastructure waits for
approval.

## Prerequisites

- Repository configured with `nx.json` (Nx monorepo)
- `gh` CLI available in the runner
- A pre-generated GitHub App token plus app slug, with `contents:write` and `pull-requests:write` permissions on the repository
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
      - uses: actions/create-github-app-token@1b10c78c7865c340bc4f6099eb2f838309f1e8c3 # v3.1.1
        id: app-token
        with:
          client-id: ${{ secrets.GH_APP_RELEASE_CLIENT_ID }}
          private-key: ${{ secrets.GH_APP_RELEASE_APP_KEY }}
          permission-contents: write
          permission-pull-requests: write

      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
          fetch-tags: "true"
          token: ${{ steps.app-token.outputs.token }}

      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: "20"

      - run: corepack enable && corepack prepare pnpm@10.30.0 --activate
      - run: pnpm install --frozen-lockfile

      - uses: pagopa/dx/actions/nx-release@main
        with:
          app-slug: ${{ steps.app-token.outputs.app-slug }}
          github-token: ${{ steps.app-token.outputs.token }}
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
4. Reuses the GitHub App token already configured by checkout for GitHub API
   calls, branch pushes, tags, and releases
5. Commits all changes and force-pushes the branch
6. Creates or updates a pull request titled `Version Packages` with a
   hidden `<!-- nx-release-tags: [...] -->` metadata comment in the body
7. Outputs `pull-request-number` and `pull-request-url`

### Mode: `Publish` (push)

`.nx/version-plans/**` changed in the push and the directory contains zero files. The action:

1. Finds the latest merged `Version Packages` PR and extracts the list of released projects
2. Builds and publishes only public projects from that release
3. Outputs deployment metadata for released Terraform environment projects so callers can dispatch independent protected plan/apply workflow runs
4. Reads the `<!-- nx-release-tags -->` metadata from all past merged PRs,
   creates any missing annotated git tags, and pushes them
5. Ensures a GitHub Release exists for every release tag found in PR metadata,
   including tags that were already present from an earlier partial run;
   pre-release builds (versions containing `-`) are marked as pre-releases

### Mode: `Publish All` (workflow_dispatch)

Triggered manually. The action:

1. Builds and publishes **all** public projects (`tag:*:public`)
2. Does not invoke Terraform environment publish targets; infrastructure recovery remains approval-gated
3. Reads the `<!-- nx-release-tags -->` metadata from all past merged PRs,
   creates any missing annotated git tags, and pushes them
4. Creates any missing GitHub Releases with extracted changelog notes

## Compatibility

- ✅ Idempotent: re-running on the same commit handles deduplication
- ✅ Supports monorepos with multiple packages
- ✅ NPM provenance enabled by default
- ✅ Compatible with custom `releaseTagPattern` in `nx.json` (tag matching does not
  assume a specific separator between package name and version)

## Troubleshooting

### PR not created

- Ensure `.nx/version-plans/` directory exists
- Verify the workflow passes `github-token` and `app-slug`, and that the GitHub App has repository write permissions
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
