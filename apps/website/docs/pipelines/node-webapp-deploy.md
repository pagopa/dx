---
sidebar_position: 50
---

# Deploying a Node.js Application to Azure

The
[Node.js WebApp Deployment](https://github.com/pagopa/dx/blob/main/.github/workflows/web_app_deploy.yaml)
is a template for workflows designed for building and deploying **Node.js** web
applications (including Next.js) from a Turborepo monorepo to Azure App
Services.

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
- Packages the necessary files into a zip archive suitable for Azure Web App
  deployment:
  - For **Next.js standalone** applications (`output: "standalone"` in
    `next.config.js`), it packages the `.next/standalone` and `.next/static`
    directories.
  - For other Node.js applications, it uses `esbuild` to bundle the code,
    creates a minimal `package.json` with production dependencies, and includes
    `node_modules` and other necessary files (like `host.json`).
- Uploads the zip archive as a workflow artifact.

**Deploy Job (`deploy`)**:

- Runs on a runner selected based on the `use_private_agent` input.
- Downloads the build artifact.
- Logs into Azure using OpenID Connect (OIDC) and the provided Azure service
  principal credentials (passed as secrets).
- Deploys the zip artifact using the `az webapp deploy` command:
  - If `use_staging_slot` is `true` (default), deploys to the `staging` slot.
  - If `use_staging_slot` is `false`, deploys directly to the `production` slot.
- If deployed to the `staging` slot, performs a slot swap using
  `az webapp deployment slot swap` to move the new version to `production`.

## Usage

To use this workflow, invoke it from your own GitHub Actions workflow file.

```yaml
name: Deploy My App Service

on:
  push:
    branches:
      - main

jobs:
  deploy_app:
    uses: pagopa/dx/.github/workflows/web_app_deploy.yaml@main
    name: Deploy Web App to Production
    with:
      workspace_name: "my-web-app-workspace" # The name of your app's workspace in turbo.json
      environment: "prod" # The target environment (e.g., dev, uat, prod)
      resource_group_name: "my-resource-group"
      web_app_name: "my-web-app"
      # use_staging_slot: true # Optional: default is true
      # use_private_agent: true # Optional: default is true
```

## Notes

- This workflow assumes your project is structured as a Turborepo monorepo.
- The workspace being deployed must have a build script in its `package.json`.
- For Next.js apps, configure output: "standalone" in next.config.js for optimal
  deployment packaging.
- For non-Next.js apps, ensure a main entry point is defined in the workspace's
  package.json.
