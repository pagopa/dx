---
sidebar_position: 50
---

# Deploying a Node.js Application to Azure

[Release Azure Webapp](https://github.com/pagopa/dx/blob/main/.github/workflows/release-azure-webapp-v1.yaml)
is a template for workflows designed for building and deploying **Node.js** web
applications (including Next.js) to Azure App Services or Azure Function Apps.

## How It Works

**Build and Deployment Overview:**

- It installs the dependencies using `pnpm` or `yarn` and builds the application
  using `turbo build` command
- The build output is packaged into a zip artifact that contains the compiled
  application code and all necessary dependencies in a `node_modules` directory.
- The artifact is deployed to the specific Azure Web App using a staging slot
  for testing before swapping to production.

**Requirements:**

- Your project must be a monorepo managed by `turbo`
- The workspace being deployed must have a `build` script in its `package.json`
  and tracked in the `turbo.json` file.
- Only standalone Next.js apps are supported, meaning you must set
  `output: "standalone"` in `next.config.ts` to make it work properly.

### How to use Auto Deployment Approval to Staging Slot

To use the Auto-Approval for staging slot deployments, you need a PAT with
required permissions stored in your GitHub repository.

Ask your platform team to create a PAT with the following permissions:

| Permission   | Access Level   |
| ------------ | -------------- |
| Actions      | Read           |
| Contents     | Read           |
| Deployments  | Read and write |
| Environments | Read           |

Add the token as a secret in your repository settings under the name
`GH_TOKEN_DEPLOYMENT_APPROVAL` via
[Terraform](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret) -
next to Bootstrap module if you are using it.

### Usage

To use this workflow, invoke it from your own GitHub Actions workflow file.

```yaml
name: Deploy (my-app)

on:
  push:
    branches:
      - main

jobs:
  deploy_app:
    uses: pagopa/dx/.github/workflows/release-azure-webapp-v1.yaml@main
    name: Deploy My App
    with:
      workspace_name: "my-app"
      environment: "app-prod"
      resource_group_name: "my-resource-group"
      web_app_name: "my-app-func-01"
      # use_staging_slot: true # Optional: default is true
      # use_private_agent: true # Optional: default is true
      # disable_auto_staging_deploy: true # Optional: default is false
```
