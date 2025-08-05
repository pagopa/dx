---
sidebar_position: 50
---

# Deploy Static Site to Azure Static Web App Workflow

The
[Build and Deploy Static Site to Azure Static Web App](https://github.com/pagopa/dx/tree/main/.github/workflows/release-azure-staticapp-v1.yaml)
is a reusable workflow (`workflow_call`) that automates the build and deployment
of a static application from a Turborepo-based monorepo to **Azure Static Web
Apps**. It is designed to provide a streamlined, secure, and consistent
deployment process, complete with integrated support for **Pull Request
previews**.

## How It Works

The workflow is divided into two distinct jobs to separate build and deployment
concerns:

1. Automatically identifies the package manager used in the project (pnpm, yarn,
   or npm), configures the runner accordingly and builds the application using
   `turbo build` command.
2. It uses the official `Azure/static-web-apps-deploy@v1` action to upload the
   built application.
3. If the workflow is triggered by a Pull Request, the deployment step
   automatically creates a temporary preview environment, allowing you to see
   your changes live before merging.

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
    uses: pagopa/dx/.github/workflows/release-azure-staticapp-v1.yaml@main # Path to the reusable workflow
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
