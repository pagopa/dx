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

**Build and Deployment Overview:**

- The workflow checks out your code, prunes the monorepo to include only the
  relevant workspace and its dependencies, and sets up Node.js.
- Dependencies are installed using Yarn, and the application is built using the
  workspace’s `build` script.
- The build output is packaged into a zip artifact:
  - For Next.js standalone apps, the workflow packages the `.next/standalone`
    and `.next/static` directories.
  - For other Node.js apps, it uses `esbuild` to bundle the code, creates a
    minimal `package.json` with production dependencies, and includes
    `node_modules` and any required files.
- The artifact is uploaded for deployment.
- The deployment job logs into Azure using OIDC and deploys the artifact to the
  specified Azure Web App, supporting both direct and staged deployments (with
  slot swapping).

**Requirements:**

- Your project must be structured as a Turborepo monorepo.
- The workspace being deployed must have a `build` script in its `package.json`.
- For Next.js apps, set `output: "standalone"` in `next.config.js` for optimal
  packaging.
- For non-Next.js apps, ensure a main entry point is defined in the workspace’s
  `package.json`.

### Key Features

- **Automatic Staging Approval:** The workflow provides an auto-approval step
  for deployments to the staging slot. This enables fully automated continuous
  deployment pipelines, allowing code to be promoted to staging without manual
  intervention. Requires to set a protection rule on the GitHub environment.
- **Flexible Runner Selection:** The workflow supports both GitHub-hosted and
  private runners for deployment, configurable via input parameters.
- **Consistent Build and Packaging:** The build and artifact packaging process
  supports both Next.js standalone and generic Node.js applications.
- **Slot Swapping:** After deploying to the staging slot, the workflow can
  automatically swap the staging and production slots, promoting the new version
  to production.

### How to use Auto Deployment Approval to Staging Slot

To use the Auto-Approval for staging slot deployments, you need a PAT with
required permissions stored in your GitHub repository:

1. Go to your project BOT GitHub user account settings.
2. Navigate to **Developer settings** > **Personal access tokens** >
   **Fine-grained tokens**.
3. Click **Generate new token**.
4. Select the repository where the workflow is located and grant the following
   permissions:
   - **Actions**: Read
   - **Contentes**: Read
   - **Deployments**: Read and write
   - **Environments**: Read
5. Copy the generated token and store it securely in a Azure KeyVault.
6. Add the token as a secret in your repository settings under the name
   `GH_TOKEN_DEPLOYMENT_APPROVAL` via
   [Terraform](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret) -
   next to Bootstrap module if you are using it.

### Usage

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
    name: Deploy Web App
    with:
      workspace_name: "my-web-app-workspace"
      environment: "prod"
      resource_group_name: "my-resource-group"
      web_app_name: "my-web-app"
      # use_staging_slot: true # Optional: default is true
      # use_private_agent: true # Optional: default is true
