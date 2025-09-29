---
sidebar_position: 1
---

# Deploy Static Site to Azure Static Web App

This guide provides a complete walkthrough for setting up and deploying a static
website to Azure Static Web Apps using Terraform for infrastructure provisioning
and GitHub Actions for automated CI/CD.

## Overview

Deploying a static site to Azure Static Web Apps involves two main phases:

1. **Infrastructure Setup**: Create the Azure Static Web App resource using
   Terraform
2. **CI/CD Configuration**: Set up automated deployment using GitHub Actions

## Prerequisites

- Azure subscription with appropriate permissions
- Terraform installed and configured
- GitHub repository with your static site code
- Azure CLI installed (for authentication)

## Step 1: Infrastructure Setup with Terraform

Create the Azure Static Web App resource using Terraform.

Use the official `azurerm_static_web_app` resource:

```hcl
resource "azurerm_static_web_app" "example" {
  name = provider::azuredx::resource_name(merge(
    var.naming_config,
    {
      name          = "website",
      resource_type = "static_web_app",
    })
  )
  resource_group_name = var.resource_group_name
  location            = "italynorth"
  sku_tier            = "Standard"

  tags = var.tags
}
```

## Step 2: Configure CI/CD with GitHub Actions

Use the reusable workflow to automate build and deployment.

The workflow automates the entire deployment process:

1. Detects your package manager (pnpm, yarn, or npm)
2. Builds the application using `turbo build`
3. Deploys using the official Azure Static Web Apps action
4. Creates preview environments for pull requests

### Workflow Configuration

Create a workflow file in `.github/workflows/`:

```yaml
name: Deploy Static App to Azure

on:
  push:
    branches:
      - main
    paths:
      - "apps/my-static-app/**"
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main
    paths:
      - "apps/my-static-app/**"

jobs:
  deploy_to_static_web_app:
    uses: pagopa/dx/.github/workflows/release-azure-staticapp-v1.yaml@main
    secrets: inherit
    with:
      workspace_name: "my-static-app" # Matches package.json name
      output_dir: "dist" # Build output directory
      static_web_app_name: "your-static-web-app-name" # From Terraform
      resource_group_name: "your-resource-group-name" # From Terraform
      environment: "app-dev"
```

### Required Permissions and Secrets

- **GitHub Environment Roles**: Assign `Contributor` and `Website Contributor`
  roles
- **Azure Identity Role**: Assign `PagoPA Static Web Apps List Secrets` role
- **Workflow Permissions**: Ensure `id-token: write`, `contents: read`,
  `pull-requests: write`
- **Secrets**: Use `secrets: inherit` or configure Azure authentication secrets

## Additional Notes

- The workflow supports preview deployments for pull requests
- Built for Turborepo monorepos with apps in the `apps/` directory
- For more details, see the
  [Azure Static Web Apps documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/)
  and
  [Terraform provider docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/static_web_app)
