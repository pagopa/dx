---
sidebar_position: 50
---

# Deploy Static Site to Azure CDN Workflow

The [Build and Deploy Static Site to Azure CDN](https://github.com/pagopa/dx/tree/main/.github/workflows/release-typescript-cdn-deploy.yaml) is reusable workflow (`workflow_call`) that automates the build and deployment of a static application from a Turborepo-based monorepo. It handles everything from dependency installation to purging the Azure CDN cache, ensuring a streamlined and consistent deployment process.

## How It Works

The workflow is divided into two distinct jobs to separate concerns and improve security:

1. **Build Job**:
    * Uses `turbo prune` to create a minimal, isolated copy of the monorepo containing only the code and dependencies required for the specified `workspace_name`.
    * Dynamically detects the package manager (`npm`, `yarn`, or `pnpm`) and uses the appropriate "clean install" command (`npm ci`, `yarn install --immutable`, `pnpm install --frozen-lockfile`) for reproducible builds.
    * Runs the `build` script for the target workspace.
    * Locates the resulting `dist` directory and uploads it as an artifact, making it available for the next job.

2. **Deploy Job**:
    * Waits for the `build` job to complete successfully.
    * Downloads the build artifact.
    * Logs into Azure using OIDC credentials configured as GitHub secrets.
    * Calls the `pagopa/dx/.github/actions/cdn-code-deploy@main` action to handle the final deployment steps:
        * Syncing the artifact's contents to the specified Azure Storage container.
        * Purging the Azure CDN endpoint to serve the latest version of the assets.

:::note
For more information about the `cdn-code-deploy` action, refer to the [documentation](./cdn-deploy.md).
:::

## Usage

To use this reusable workflow, you need to call it from another workflow file in your repository. Below is an example of how to trigger it.

```yaml
name: Deploy My Static App

on:
  workflow_dispatch: # Allows manual triggering
  push:
    branches:
      - main
    paths:
      - 'apps/my-static-app/**' # Trigger only when this app changes

jobs:
  deploy_to_cdn:
    uses: pagopa/dx/.github/workflows/release-typescript-cdn-deploy.yaml@main # Path to the reusable workflow
    secrets: inherit
    with:
      workspace_name: "my-static-app" # The 'name' from the app's package.json
      storage_account_name: "your-storage-account-name"
      resource_group_name: "your-resource-group-name"
      profile_name: "your-cdn-profile-name"
      endpoint_name: "your-cdn-endpoint-name"
      environment: "infra-dev"
```

When implementing this workflow:

1. **Workspace Name**: Ensure the `workspace_name` input matches the `name` field in the `package.json` of the application you want to deploy, not the directory path.
2. **Permissions & Secrets**: The calling workflow must have the necessary permissions and secrets (e.g., for Azure login) available. Using `secrets: inherit` is the easiest way to pass them down.
3. **Monorepo Structure**: This workflow is optimized for a monorepo managed with Turborepo. It assumes your applications are located in workspaces (e.g., under an `apps/` directory).
