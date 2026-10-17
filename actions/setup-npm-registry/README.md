# Setup npm registry GitHub Action

This GitHub Action authenticates npm and pnpm to the GitHub Packages registry that hosts DX packages, so that dependencies referenced with pnpm's `gh:` alias (for example `gh:pagopa/dx/...`) can be installed.

It appends the registry credential to the user-level `$HOME/.npmrc` as a `${NODE_AUTH_TOKEN}` placeholder: the value is expanded by npm and pnpm at install time, so no secret is ever written to disk. Only the user-level npmrc expands environment variables, the repository-level one does not.

## Features

- Configures GitHub Packages authentication with a single step, without duplicating npmrc bootstrap scripts across jobs.
- Never persists the token: only a placeholder is stored on disk.
- Idempotent, so it can safely run more than once in the same job.

## Inputs

None.

## Usage

The action only configures the registry. The steps that install dependencies must expose the token as `NODE_AUTH_TOKEN` in their own environment, which keeps the credential scoped to those steps.

```yaml
jobs:
  build:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      packages: read
    steps:
      - name: Check out repository
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Setup npm registry
        uses: pagopa/dx/actions/setup-npm-registry@main

      - name: Install dependencies
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: pnpm --filter . ci
```

Workflows in this repository reference the action through the local path, which requires no ref:

```yaml
- name: Setup npm registry
  uses: $/actions/setup-npm-registry
```

## Notes

- The job needs the `packages: read` permission, otherwise the registry rejects the token.
- Reference this action instead of writing the npmrc bootstrap inline: it is the single place where the registry credential handling is maintained.
