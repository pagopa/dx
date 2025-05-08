---
sidebar_position: 1
sidebar_label: Deploy a Node.js Application to Azure Function App
---

# Deploy a Node.js Application to Azure Function App

The
[Node.js FunctionApp Deployment](https://github.com/pagopa/dx/blob/main/.github/workflows/function_app_deploy.yaml)
is a reusable GitHub Actions workflow designed for building and deploying
**Node.js** applications from a monorepo based on Turbo to Azure Function Apps.

## How It Works

The workflow consists of two main jobs:

**Build Job (`build`)**:

- Checks out the source code.
- Uses `turbo prune` to create an isolated build environment containing only the
  specified workspace and its dependencies.
- Sets up Node.js and installs dependencies using Yarn within the pruned
  directory.
- Builds the application using the `build` script defined in the workspace's
  `package.json`.
- Packages the necessary files (`dist`, `function.json`, `host.json`, etc.) into
  a zip archive suitable for Azure Function App deployment.
- Uploads the zip archive as a workflow artifact.

**Deploy Job (`deploy`)**:

- Runs on a runner selected based on the `use_private_agent`, `use_labels`,
  `override_labels`, and `environment` inputs.
- Downloads the build artifact.
- Logs into Azure using OpenID Connect (OIDC) and the provided Azure service
  principal credentials (passed as secrets).
- Checks if the target Function App has the required warm-up settings
  (`WEBSITE_SWAP_WARMUP_PING_PATH` and `WEBSITE_SWAP_WARMUP_PING_STATUSES`).
- Clears any existing traffic routing rules on the Function App.
- Deploys the zip artifact:
  - If `use_staging_slot` is `true` (default), deploys to the `staging` slot.
  - If `use_staging_slot` is `false`, deploys directly to the `production` slot.
- If deployed to the `staging` slot, performs a slot swap to move the new
  version to `production`.

## Usage

To use this workflow, invoke it from your own GitHub Actions workflow file.

```yaml
name: Deploy My Function App

on:
  push:
    branches:
      - main

jobs:
  deploy_app:
    uses: pagopa/dx/.github/workflows/function_app_deploy.yaml@main
    name: Deploy Function App to Production
    with:
      workspace_name: "my-function-app-workspace" # The name of your app's workspace in turbo.json
      environment: "prod" # The target environment (e.g., dev, uat, prod)
      resource_group_name: "my-resource-group"
      function_app_name: "my-function-app"
      # use_staging_slot: true # Optional: default is true
      # use_private_agent: true # Optional: default is true
      # use_labels: false # Optional: default is false
      # override_labels: '' # Optional: default is ""
```

## Notes

- This workflow assumes your project is structured as a Turborepo monorepo.
- The workspace being deployed must have a build script in its `package.json`.
- The target Azure Function App must have the `WEBSITE_SWAP_WARMUP_PING_PATH`
  and `WEBSITE_SWAP_WARMUP_PING_STATUSES` application settings configured if
  using the staging slot (`use_staging_slot`: true). The workflow will fail if
  these are missing.
