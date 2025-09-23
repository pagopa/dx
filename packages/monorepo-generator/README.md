# @pagopa/monorepo-generator

A package that generates a monorepo scaffold following PagoPA DX conventions.

## Overview

The `@pagopa/monorepo-generator` provides a plop-based generator and templates to bootstrap a new monorepo with the repository layout, configuration and files used across the DX initiative.

> Work in progress — expect improvements to templates and prompts.

## Required environment variables

- `GITHUB_TOKEN` (optional but recommended): a GitHub personal access token to increase API rate limits and avoid being blocked by unauthenticated limits. If not present the generator will perform unauthenticated requests and may hit rate limits.

If you have authenticated with the GitHub CLI (`gh`) or another local auth mechanism that exposes a token to the environment/Octokit, you typically don't need to manually set `GITHUB_TOKEN` — local authentication will allow the generator to perform authenticated requests.

## Variables provided to templates

The generator exposes the following variables to Handlebars templates. Use the Handlebars syntax `{{variableName}}` inside templates.

| Variable                              | Source                       | Description & format example                                                                                                                                                     |
| ------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repoSrc`                             | prompt                       | Directory where the repository will be created. Defaults to the current working directory (prompt default).                                                                      |
| `repoName`                            | prompt                       | Repository name provided by the user (string).                                                                                                                                   |
| `repoDescription`                     | prompt                       | Repository description provided by the user (string).                                                                                                                            |
| `csp`                                 | prompt                       | Cloud provider selection. One of `aws` or `azure` (prompt type: list, default `azure`).                                                                                          |
| `terraformVersion`                    | custom action (GitHub fetch) | Terraform version used to populate `.terraform-version`. Full semver string, e.g. `1.5.7`.                                                                                       |
| `githubTfProviderVersion`             | custom action (GitHub fetch) | Version used inside Terraform infra templates for the GitHub provider/module. Formatted as `major.minor` (e.g. `4.13`). Derived from the latest provider release.                |
| `dxGithubEnvironmentBootstrapVersion` | custom action (GitHub fetch) | Version/tag used by infra templates to bootstrap GitHub environment resources. Formatted as `major.minor` (e.g. `0.2`). Derived from the latest tag of the bootstrap repository. |
| `preCommitTerraformVersion`           | custom action (GitHub fetch) | Version used for the `pre-commit-terraform` hooks in the generated `.pre-commit-config.yaml`. Already includes the leading `v` (e.g. `v1.81.0`).                                 |
| `repoStateResourceGroupName`          | prompt (conditional)         | Azure only — resource group name that stores the remote Terraform state (only when `csp === 'azure'`).                                                                           |
| `repoStateStorageAccountName`         | prompt (conditional)         | Azure only — storage account name that holds the `terraform-state` container (only when `csp === 'azure'`).                                                                      |
| `awsAccountId`                        | prompt (conditional)         | AWS only — AWS account id. Used to derive the remote state bucket name `<accountId>-terraform-state` (only when `csp === 'aws'`).                                                |
| `awsRegion`                           | prompt (conditional)         | AWS only — region for the S3 backend (default `eu-west-1`) (only when `csp === 'aws'`).                                                                                          |

## Recommended usage

This package exports the generator function. To use it, you can create your own plopfile (`plopfile.js`) and register the generator.

1. Install plop and the generator package in the consumer repository (plop must be provided by the consumer):

```sh
pnpm add -D plop
pnpm add @pagopa/monorepo-generator
```

2. Example repository-level plopfile (JavaScript)

```js
// plopfile.js
const scaffoldMonorepo = require("@pagopa/monorepo-generator");

module.exports = function (plop) {
  scaffoldMonorepo(plop);
};
```

Or TypeScript plopfile (`plopfile.ts`)

```ts
import scaffoldMonorepo from "@pagopa/monorepo-generator";

export default function (plop) {
  scaffoldMonorepo(plop);
}
```

3. Run plop from your repository root to use the registered generator:

```sh
pnpm plop
```

Select the "monorepo" generator and follow prompts.

> [!NOTE]
> This package declares `plop` as a peer dependency, so you will have to install plop in your project.
