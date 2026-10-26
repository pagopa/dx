# Setup npm registry GitHub Action

This GitHub Action authenticates npm and pnpm to the GitHub Packages registry that hosts DX packages, so that dependencies referenced with pnpm's `gh:` alias (for example `gh:pagopa/dx/...`) can be installed.

It writes the credential to a private npmrc under `runner.temp` and exports `NPM_CONFIG_USERCONFIG` for the rest of the job, so consumers only configure one variable: the token.

## Features

- Configures GitHub Packages authentication with a single step, without duplicating npmrc bootstrap scripts across jobs.
- Expands the token at write time, so the file never contains a `${VAR}` placeholder. A placeholder is re-evaluated by every npm and pnpm invocation that loads the npmrc, and any step that cannot see the variable prints `Failed to replace env in config: ${...}`.
- Keeps the credential out of `$HOME/.npmrc` and out of the repository: the file lives in `$RUNNER_TEMP`, which the runner wipes at the start of every job.
- Idempotent, so it can safely run more than once in the same job.

## Inputs

| Input   | Required | Description                                                                         |
| ------- | -------- | ----------------------------------------------------------------------------------- |
| `token` | yes      | Token with `packages:read` on GitHub Packages, or `packages:write` when publishing. |

## Usage

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
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Install dependencies
        run: pnpm --filter '{.}...' ci
```

The installing step needs no extra configuration: the action already exported `NPM_CONFIG_USERCONFIG`, so every later npm and pnpm invocation of the job loads the npmrc.

Reference it with an absolute ref. The `$/` syntax cannot be used here: it always resolves against the top-level caller's repository, and this action is consumed from `validate-v2.yaml`, an `on: workflow_call` workflow that other repositories invoke as `pagopa/dx/.github/workflows/validate-v2.yaml@main`.

## Caller requirements

The job that runs the action must grant the `packages` permission, otherwise the registry rejects the token with `401`:

| Use case                   | Permission        |
| -------------------------- | ----------------- |
| Installing dependencies    | `packages: read`  |
| Publishing to the registry | `packages: write` |

A reusable workflow cannot elevate the permissions of its caller. The `GITHUB_TOKEN` of the called workflow is the intersection between the permissions granted by the calling job and the ones requested by the called workflow: GitHub downgrades the extra permissions instead of rejecting the call. A caller that pins `permissions` without `packages`, for example:

```yaml
permissions:
  contents: read
```

downgrades `packages` to `none` even when the reusable workflow declares `packages: read`. The run is not rejected upfront: it fails when the install reaches the registry and the token is refused with `401`. When a reusable workflow declares `packages: read`, add it to every calling job:

```yaml
jobs:
  build:
    permissions:
      contents: read
      packages: read
    uses: octo-org/example-repo/.github/workflows/build.yaml@main
```

The snippet only illustrates the `packages` entry. Keep the permissions and secrets documented by the called workflow, because a `permissions` block on the calling job sets every scope it does not list to `none`. For example, `release-v2.yaml` also requires `contents: write`, `id-token: write`, `pull-requests: write` and the GitHub App secrets, as shown in the Nx release documentation.

## Package manager support

| Package manager  | Reads the npmrc exported by this action | Notes                                                                     |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| npm              | Yes                                     | Honors `NPM_CONFIG_USERCONFIG`.                                           |
| pnpm             | Yes                                     | Honors `NPM_CONFIG_USERCONFIG`; this is the supported DX package manager. |
| Yarn 1 (Classic) | Yes                                     | Reads `.npmrc`.                                                           |
| Yarn 2+ (Berry)  | No                                      | Ignores `.npmrc` and `NPM_CONFIG_USERCONFIG`.                             |

Yarn Berry resolves registries from `.yarnrc.yml` only, so a consumer that installs DX packages through `gh:` with Yarn 2+ must configure the scope in the repository itself:

```yaml
npmScopes:
  pagopa:
    npmRegistryServer: "https://npm.pkg.github.com"
    npmAuthToken: "${NODE_AUTH_TOKEN}"
```

and export `NODE_AUTH_TOKEN` on the steps that run Yarn. This action does not write `.yarnrc.yml`, because editing a tracked file of the consumer repository is outside its scope. The `yarn install --immutable` branch of `release-v2.yaml` is therefore not covered by the setup step.

## Notes

- The job needs the `packages: read` permission (`packages: write` when publishing), otherwise the registry rejects the token.
- Pass the token through the `token` input. The action forwards it to the shell through an environment variable instead of interpolating it into the script, so the value never appears in the generated command.
- The credential is written to `$RUNNER_TEMP/dx-npmrc` with `0600` permissions and stays there for the duration of the job. It never reaches `$HOME`, which on self-hosted runners persists across jobs, and the runner removes the directory at the start of the next job.
- Exporting `NPM_CONFIG_USERCONFIG` makes npm and pnpm ignore `$HOME/.npmrc` for the rest of the job. CI runners have no other configuration to inherit, but a consumer that keeps custom user-level npm settings must merge them into the exported file.
- Reference this action instead of writing the npmrc bootstrap inline: it is the single place where the registry credential handling is maintained.
