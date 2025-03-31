---
sidebar_position: 1
sidebar_label: Deploy Azure Web App - Legacy
---

# Deploy Azure Web App - Legacy

The
[Deploy Pipelines - Legacy workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/legacy_deploy_pipelines.yaml)
is used to build and deploy **Node.js** applications to **Azure Web App**, which
is part of the Azure App Service platform.

:::caution

This workflow has been deprecated as part of the migration to a monorepo
architecture.

:::

## How It Works

The workflow performs the following steps:

1. Checks out the code from the repository.
2. Set up `Node.js`, installs dependencies and builds the project.
3. Packages the application into a zip file.
4. Uploads the zip file as an artifact.
5. Deploys the artifact to an Azure Web App, optionally using a staging slot.

:::info

Ensure that `yarn` is properly configured in your project with the necessary
scripts for building and deploying the application. The `package.json` file must
define the following npm tasks:

- `build`: To compile the project.
- `predeploy`: To prepare the application for deployment, such as cleaning and
  generating necessary files.

These scripts are critical for the workflow to execute successfully.

:::

## Usage

To use the Deploy Pipelines workflow, you can invoke it as a reusable workflow
in your repository. Below is an example configuration:

```yaml
name: Deploy Pipelines

on:
  workflow_dispatch:

jobs:
  deploy_pipelines:
    uses: pagopa/dx/.github/workflows/legacy_deploy_pipelines.yaml@main
    name: Deploy on PROD
    secrets: inherit
    with:
      environment: "prod"
      resource_group_name: "my-resource-group"
      app_name: "my-app"
      health_check_path: "/health"
      use_staging_slot: true
      use_private_agent: false
```

### Notes

- The workflow supports slot swapping for zero-downtime deployments.
- Ensure that the necessary Azure credentials are configured as secrets in your
  repository.

:::warning

Make sure to configure `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`, and
`ARM_CLIENT_ID` in your GitHub repository secrets for secure authentication. For
detailed instructions, refer to:
[Configuring Azure Login for GitHub Actions](./azure-login.md).

:::
