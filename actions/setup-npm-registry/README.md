# Setup npm registry GitHub Action

This GitHub Action authenticates npm and pnpm to the GitHub Packages registry that hosts DX packages, so that dependencies referenced with pnpm's `gh:` alias (for example `gh:pagopa/dx/...`) can be installed.

It writes the registry credential to a dedicated npmrc, under `runner.temp`, as a `${NODE_AUTH_TOKEN}` placeholder: the value is expanded by npm and pnpm at install time, so no secret is ever written to disk.

The file is deliberately **not** the user-level `$HOME/.npmrc`. Every npm and pnpm invocation of a job loads the user-level npmrc, so a placeholder left there makes each later step that does not export `NODE_AUTH_TOKEN` print `Failed to replace env in config: ${NODE_AUTH_TOKEN}`. The action exposes the npmrc location as an output instead, and consumers point `NPM_CONFIG_USERCONFIG` at it only on the steps that need the credential.

## Features

- Configures GitHub Packages authentication with a single step, without duplicating npmrc bootstrap scripts across jobs.
- Never persists the token: only a placeholder is stored on disk.
- Keeps the placeholder scoped to the steps that consume it, so unrelated npm and pnpm invocations in the same job stay quiet.
- Idempotent, so it can safely run more than once in the same job.

## Inputs

None.

## Outputs

| Output       | Description                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `npmrc-path` | Path of the npmrc that holds the credential. Pass it as `NPM_CONFIG_USERCONFIG` to the steps that install or publish packages. |

## Usage

The action only configures the registry. The steps that install dependencies must expose the token as `NODE_AUTH_TOKEN` and point `NPM_CONFIG_USERCONFIG` at the output, which keeps both the file and the credential scoped to those steps.

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
        id: setup-npm-registry
        uses: pagopa/dx/actions/setup-npm-registry@main

      - name: Install dependencies
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_CONFIG_USERCONFIG: ${{ steps.setup-npm-registry.outputs.npmrc-path }}
        run: pnpm --filter . ci
```

Reference it with an absolute ref. The `$/` syntax cannot be used here: it always resolves against the top-level caller's repository, and this action is consumed from `validate-v2.yaml`, an `on: workflow_call` workflow that other repositories invoke as `pagopa/dx/.github/workflows/validate-v2.yaml@main`.

```yaml
- name: Setup npm registry
  id: setup-npm-registry
  uses: pagopa/dx/actions/setup-npm-registry@main
```

## Notes

- The job needs the `packages: read` permission, otherwise the registry rejects the token.
- The token is deliberately not an input. The action only declares where the credential is read from; the steps that consume it expose it as `NODE_AUTH_TOKEN`, which keeps the secret out of the npmrc and scoped to those steps. This mirrors `actions/setup-node` with `registry-url`, which also writes a `${NODE_AUTH_TOKEN}` placeholder and expects the caller to set the variable — with the difference that this action does not put the file in the user-level npmrc, so the placeholder cannot leak into unrelated steps.
- Setting `NPM_CONFIG_USERCONFIG` makes npm and pnpm ignore `$HOME/.npmrc` for that step. CI runners have no other configuration to inherit, but a consumer that keeps custom user-level npm settings must merge them into the file pointed to by the output.
- Reference this action instead of writing the npmrc bootstrap inline: it is the single place where the registry credential handling is maintained.
