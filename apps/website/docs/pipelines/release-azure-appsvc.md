---
sidebar_position: 50
---

# Deploy Azure App Service and Function Apps

To deploy your application to Azure App Service or Function Apps, you can use
the
[`release-azure-appsvc`](https://github.com/pagopa/dx/blob/main/.github/workflows/release-azure-appsvc-v1.yaml)
resusable workflow.

## Overview

This workflow builds your application using `turbo`, packages it into a zip
artifact, and deploys it to Azure App Service or Function Apps. If a `staging`
slot is available, it performs a blue-green deployment.

It also supports [canary deployment](#canary-deployments), allowing you to
redirect a percentage of traffic to the new deployment before swapping it with
the production slot.

## Requirements

- The repository must be a JavaScript monorepo, with
  [`Yarn`](https://yarnpkg.com/) or [`PNPM`](https://pnpm.io/) as package
  manager and [`turbo`](https://turborepo.com/docs) as build tool.
- The workspace being deployed must have a `build` script in its `package.json`
- The repository must have been initialized with the
  [azure-github-environment-bootstrap](https://registry.terraform.io/modules/pagopa-dx/azure-github-environment-bootstrap/azurerm/latest)
  module, which creates the required environment, permissions and roles to
  perform the deployment.

## Features

### Artifact building

This workflow builds the application and packages it into a zip artifact, which
contains the code and its dependencies stored in the `node_modules` folder, and
can be deployed to Azure App Service and Function Apps.

The build is performed using the `turbo build` command from the root of the
monorepo. The workspace being deployed must have a `build` script in its
`package.json` and be tracked in the `turbo.json` file.

_Example of `turbo.json` file:_

```json title="turbo.json"
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**/*.ts"],
      "outputs": ["dist/**", "bin/**"]
    }
  }
}
```

#### Deploying Next.js apps

This worklow supports deploying Next.js apps in standalone mode. To make your
application deployable, you must set the `output: "standalone"` option in your
`next.config.ts` file.

```ts title="next.config.ts"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // other Next.js configuration options
  // ...
};

export default nextConfig;
```

### Auto-approve staging slot deployments

When the web app has a `staging` slot, the workflow will first deploy the
artifact to it and then swap it with the production slot.

This deployment requires an approval that can be automated by using a GitHub Bot
user with the appropriate permissions.

This feature is enabled by default, but you can disable it by setting the
`disable_auto_staging_deploy` input to `true`.

#### Enabling Auto-Approval

To use the Auto-Approval for staging slot deployments, you need a PAT with
required permissions stored in your GitHub repository.

1. Ask your _Engineering Leader_ to create a Personal Access Token (PAT) with
   the following permissions to your repository:

   | Permission   | Access Level   |
   | ------------ | -------------- |
   | Actions      | Read           |
   | Contents     | Read           |
   | Deployments  | Read and write |
   | Environments | Read           |

   The PAT should be associated with a user (e.g., `pagopa-bot`) that has
   permission to approve deployments in the repository.

2. Edit the bootstrap module (`./infra/bootstrapper`) to add the PAT as Github
   Repository Secret, via Terraform. The secret must be named
   `GH_TOKEN_DEPLOYMENT_APPROVAL`.

   ```hcl
   data "azurerm_key_vault_secret" "gh_token_deployment_approval" {
     name         = "gh-token-deployment-approval"
     key_vault_id = module.core_values.common_key_vault.id
   }

   resource "github_actions_secret" "gh_token_deployment_approval" {
     repository       = var.repository.name
     secret_name      = "GH_TOKEN_DEPLOYMENT_APPROVAL"
     plaintext_value  = data.azurerm_key_vault_secret.gh_token_deployment_approval.value
   }
   ```

### Canary deployments

This workflow supports canary deployments by executing the `canary-monitor.sh`
script, which should be located in the root directory of your repository. After
deploying to the `staging` slot, this script will run to determine the
percentage of traffic that should be routed to the new deployment.

By default, when the `canary-monitor.sh` script is not present, the workflow
will route 100% of the traffic to the new deployment.

#### Enabling Canary Deployments

To enable canary deployments, you need to create a `canary-monitor.sh` script in
the root directory of your repository. This script should contain the logic to
determine the percentage of traffic to route to the new deployment.

The script will be called with the following arguments:

```bash
bash canary-monitor.sh <resource_group_name> <web_app_name> <current_percentage>
```

And it should return a JSON containing the new percentage of traffic to route
and a `delayMs` value to wait before the next check, like this:

```json
{
  "nextPercentage": 50,
  "delayMs": 60000
}
```

If the script returns a non-zero exit code, the workflow will stop and will
redirect all the traffic to the production slot, effectively rolling back the
deployment.

### Safe swapping

To avoid deploying non-healthy applications, the workflow requires the web app
to have set the following variables:

- `WEBSITE_SWAP_WARMUP_PING_PATH`: The path to ping to check if the app is
  healthy before swapping.
- `WEBSITE_SWAP_WARMUP_PING_STATUSES`: The HTTP status codes that are considered
  healthy (e.g., `200,202,204`).

If these variables are not set, the workflow will stop and will not deploy the
code, even to the `staging` slot.

These variables are set automatically by the DX
[`azure_app_service`](https://registry.terraform.io/modules/pagopa-dx/azure-app-service/azurerm/latest)
and
[`azure-function-app`](https://registry.terraform.io/modules/pagopa-dx/azure-function-app/azurerm/latest)
modules, so make sure to use their latest version.

### Usage

To use this workflow, invoke it from your own GitHub Actions workflow file.

```yaml title="deploy-my-app.yaml"
name: Deploy (my-app)

on:
  push:
    branches:
      - main

jobs:
  deploy_app:
    uses: pagopa/dx/.github/workflows/release-azure-appsvc-v1.yaml@main
    name: Deploy My App
    with:
      workspace_name: "my-app"
      environment: "app-prod"
      resource_group_name: "my-resource-group"
      web_app_name: "my-app-func-01"
```

#### Migration Guide

##### From `web_app_deploy.yaml` and `function_app_deploy.yaml`

1. Replace workflow referenced in the `uses` key with the new
   `release-azure-appsvc-v1.yaml` workflow.

   ```yaml
   deploy_app:
     // highlight-next-line
     uses: pagopa/dx/.github/workflows/function_app_deploy.yaml@main
     name: Deploy My App
     with:
       workspace_name: "my-app"
       environment: "app-prod"
       resource_group_name: "my-resource-group"
       function_app_name: "my-app-func-01"
       use_staging_slot: true
   ```

2. Remove the `use_staging_slot` input (the new workflow calls azure at runtime
   to check if the staging slot is available).

   ```yaml
   deploy_app:
     uses: pagopa/dx/.github/workflows/release-azure-appsvc-v1.yaml@main
     name: Deploy My App
     with:
       workspace_name: "my-app"
       environment: "app-prod"
       resource_group_name: "my-resource-group"
       function_app_name: "my-app-func-01"
   ```

3. Replace the `function_app_name` input with `web_app_name`. The term `web_app`
   is used by Azure to refer to both App Services and Function Apps.

   ```yaml
   deploy_app:
     uses: pagopa/dx/.github/workflows/release-azure-appsvc-v1.yaml@main
     name: Deploy My App
     with:
       workspace_name: "my-app"
       environment: "app-prod"
       resource_group_name: "my-resource-group"
       // highlight-next-line
       web_app_name: "my-app-func-01"
   ```

4. Disable the auto-approval of staging slot deployments by setting the
   `disable_auto_staging_deploy` input to `true`. This settings can disabled
   once you configure the [Auto-Approval](#enabling-auto-approval) for staging
   slot deployments.

   ```yaml
   deploy_app:
     uses: pagopa/dx/.github/workflows/release-azure-appsvc-v1.yaml@main
     name: Deploy My App
     with:
       workspace_name: "my-app"
       environment: "app-prod"
       resource_group_name: "my-resource-group"
       web_app_name: "my-app-func-01"
       // highlight-next-line
       disable_auto_staging_deploy: true
   ```
