---
sidebar_position: 50
---

# Deploy Static Site to Azure Static Web App Workflow

The
[Build and Deploy Static Site to Azure Static Web App](https://github.com/pagopa/dx/tree/main/.github/workflows/release-typescript-static-website-deploy-v1.yaml)
is a reusable workflow (`workflow_call`) that automates the build and deployment
of a static application from a Turborepo-based monorepo to **Azure Static Web
Apps**. It is designed to provide a streamlined, secure, and consistent
deployment process, complete with integrated support for **Pull Request
previews**.

## How It Works

The workflow is divided into two distinct jobs to separate build and deployment
concerns:

1. **`build` Job**:
   - Runs on a standard `ubuntu-latest` runner.
   - Uses `turbo prune` to create a minimal, isolated copy of the monorepo
     containing only the code and dependencies required for the specified
     `workspace_name`.
   - Dynamically detects the package manager (`npm`, `yarn`, or `pnpm`) and uses
     the appropriate "clean install" command for reproducible builds.
   - Runs the `build` script for the target workspace using Turborepo.
   - Locates the resulting build output directory (e.g., `build` or `dist`) and
     uploads it as an artifact, making it available for the deployment job.

2. **`deploy` Job**:
   - Waits for the `build` job to complete successfully.
   - Runs on a configurable runner (public or self-hosted) based on input
     parameters.
   - Downloads the build artifact.
   - Logs into Azure using OIDC credentials configured as GitHub secrets.
   - Retrieves the **deployment token** (API key) from the target Azure Static
     Web App. This token is used to authorize the deployment.
   - Calls the official `Azure/static-web-apps-deploy@v1` action to handle the
     final deployment, uploading the pre-built application assets. This action
     also automatically handles the creation and management of **preview
     environments** for Pull Requests.

## Usage

To use this reusable workflow, you need to call it from another workflow file in
your repository. Below is an example of how to trigger it for a specific
application.

```yaml
name: Deploy My Static App to Azure

on:
  push:
    branches:
      - main
    paths:
      - "apps/my-static-app/**" # Trigger only when this app changes
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main
    paths:
      - "apps/my-static-app/**"

jobs:
  deploy_to_static_web_app:
    uses: pagopa/dx/.github/workflows/release-typescript-static-website-deploy-v1.yaml@main # Path to the reusable workflow
    secrets: inherit
    with:
      workspace_name: "my-static-app" # The 'name' from the app's package.json
      output_dir: "dist" # The build output directory name
      static_web_app_name: "your-static-web-app-name"
      resource_group_name: "your-resource-group-name"
      environment: "app-dev"
```

### Important Notes

1. **Trigger Configuration**: The calling workflow must be triggered on `push`
   and `pull_request` events for the preview environment functionality to work
   correctly.
2. **Workspace Name**: Ensure the `workspace_name` input matches the `name`
   field in the `package.json` of the application you want to deploy, not its
   directory path.
3. **Permissions & Secrets**: The calling workflow must have the necessary
   permissions (`id-token: write`, `contents: read`, `pull-requests: write`) and
   secrets (e.g., for Azure login) available. Using `secrets: inherit` is the
   easiest way to pass them down.
4. **Monorepo Structure**: This workflow is optimized for a monorepo managed
   with Turborepo. It assumes your applications are located in workspaces (under
   an `apps/` directory).
