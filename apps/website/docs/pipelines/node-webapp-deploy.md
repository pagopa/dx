---
sidebar_position: 50
---

# Deploying a Node.js Application to Azure

The
[Node.js WebApp Deployment](https://github.com/pagopa/dx/blob/main/.github/workflows/release-azure-webapp-v2.yaml)
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

- **Automatic Staging Approval:** V2 introduces an auto-approval step for
  deployments to the staging slot. This enables fully automated continuous
  deployment pipelines, allowing code to be promoted to staging without manual
  intervention. If your environment requires manual approval, you can configure
  the workflow to force a successful exit code for the approval step, ensuring
  the workflow completes as expected.
- **Flexible Runner Selection:** The workflow supports both GitHub-hosted and
  private runners for deployment, configurable via input parameters.
- **Consistent Build and Packaging:** The build and artifact packaging process
  remains consistent with v1, supporting both Next.js standalone and generic
  Node.js applications.
- **Slot Swapping:** After deploying to the staging slot, the workflow can
  automatically swap the staging and production slots, promoting the new version
  to production.

### Upgrading from V1 to V2

To upgrade from V1 to V2, follow these steps:

1. **Update Workflow Reference:** Change your workflow file to use
   `release-azure-webapp-v2.yaml` instead of `web_app_deploy.yaml`.
2. **Configure Auto-Approval:**
   - If you want fully automated staging deployments, provide a fine-grained
     GitHub token (`GH_TOKEN_DEPLOYMENT_APPROVAL`) with deployment approval
     permissions.
   - If your environment does not require manual approval, set
     `force_approval_exit_code: true` to bypass the approval step.
3. **Review Inputs:** All previous inputs are supported. New inputs
   (`force_approval_exit_code`, `GH_TOKEN_DEPLOYMENT_APPROVAL`) are optional but
   recommended for automation.
4. **Test Your Pipeline:** Run the workflow and verify that deployments to
   staging and production work as expected, and that the auto-approval step
   behaves according to your configuration.

### Generating a GitHub Token for GH_TOKEN_DEPLOYMENT_APPROVAL

To generate a GitHub token for the `GH_TOKEN_DEPLOYMENT_APPROVAL` variable:

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
7. Use this token in your workflow configuration.

### Usage

To use the v2 workflow, reference it in your GitHub Actions workflow file:

```yaml
name: Deploy My App Service

on:
  push:
    branches:
      - main

jobs:
  deploy_app:
    uses: pagopa/dx/.github/workflows/release-azure-webapp-v2.yaml@main
    name: Deploy Web App to Production
    with:
      workspace_name: "my-web-app-workspace"
      environment: "prod"
      resource_group_name: "my-resource-group"
      web_app_name: "my-web-app"
      # use_staging_slot: true # Optional: default is true
      # use_private_agent: true # Optional: default is true
      # force_approval_exit_code: false # Optional: see migration guide
      # GH_TOKEN_DEPLOYMENT_APPROVAL: ${{ secrets.GH_TOKEN_DEPLOYMENT_APPROVAL }} # Required for auto-approval
```

### (Legacy) V1 Version

The `web_app_deploy.yaml`
[workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/web_app_deploy.yaml)
is the legacy template for Node.js web app deployments. It provides the same
build and deployment logic as v2 but lacks the automated approval step for
staging deployments.

#### Example Usage

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
      workspace_name: "my-web-app-workspace"
      environment: "prod"
      resource_group_name: "my-resource-group"
      web_app_name: "my-web-app"
      # use_staging_slot: true # Optional: default is true
      # use_private_agent: true # Optional: default is true
```
