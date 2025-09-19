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

| Variable                              | Source                       | Description                                                                   |
| ------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| `repoSrc`                             | prompt                       | Directory where the repository will be created                                |
| `repoName`                            | prompt                       | Repository name provided by the user                                          |
| `repoDescription`                     | prompt                       | Repository description provided by the user                                   |
| `terraformVersion`                    | custom action (GitHub fetch) | Terraform version used to populate `.terraform-version`                       |
| `githubTfProviderVersion`             | custom action (GitHub fetch) | Version used inside Terraform infra templates for the GitHub provider/module  |
| `dxGithubEnvironmentBootstrapVersion` | custom action (GitHub fetch) | Version/tag used by infra templates to bootstrap GitHub environment resources |

## Recommended usage

This package exports the generator function. To use it, you can create your own plopfile (`plopfile.js`) and register the generator.

1. Install plop and the generator package in the consumer repository (plop must be provided by the consumer):

```sh
pnpm add -D plop
pnpm add @pagopa/monorepo-generator
```

2. Example repository-level plopfile (JavaScript)

Create a top-level plopfile.js in your repo:

```js
// plopfile.js
const scaffoldMonorepo = require("@pagopa/monorepo-generator");

module.exports = function (plop) {
  // register the generator exported by the package
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
