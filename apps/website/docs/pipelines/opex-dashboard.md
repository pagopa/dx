---
sidebar_position: 6
---

# Deploy OpEx Dashboards

Reusable workflow for automatically detecting changes to dashboard configuration
files and their referenced OpenAPI specifications, generating Azure Dashboard
Terraform code, and deploying it to your infrastructure using parallel matrix
strategy.

## Prerequisites

- GitHub environments `opex-prod-cd` and `opex-prod-ci` configured with secrets
  for Cloud Service Provider authentication
- Dashboard configuration files located in `.opex/**/config.yaml` paths in the
  repository, referencing OpenAPI specs

## Features

- 🔄 **Automatic Generation**: Uses `@pagopa/opex-dashboard` npm package to
  generate Terraform code
- ⚡ **Parallel Processing**: Deploys up to 5 dashboards in parallel with matrix
  strategy
- 🚀 **Integrated Deployment**: Handles complete Terraform lifecycle (plan and
  apply) with separate CI/CD environments
- 🌍 **Standard Structure**: Expects dashboard configs in `.opex/**/config.yaml`
  paths repository

## Architecture

This solution consists of two components:

1. **Reusable Workflow**
   ([opex-dashboard-deploy.yaml](https://github.com/pagopa/dx/blob/main/.github/workflows/opex-dashboard-deploy.yaml)):
   Orchestrates the entire process from generation to deployment
2. **Composite Action**
   ([opex-dashboard-generate](https://github.com/pagopa/dx/tree/main/actions/opex-dashboard-generate)):
   Detects changes and generates Terraform code

## Usage

```yaml
name: Deploy OpEx Dashboards

permissions:
  id-token: write
  contents: read

on:
  push:
    branches: [main]
    paths:
      - ".opex/**/config.yaml"
      - "**/openapi.yaml"

jobs:
  deploy:
    uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
    secrets: inherit
```

## Config File Format

Dashboard config files should reference their OpenAPI specs using the `oa3_spec`
field:

```yaml
oa3_spec: ../../openapi/my-service.yaml
dashboard_name: My Service Dashboard
# ... other configuration
```

## Security Considerations

- **Secrets Inheritance**: Workflow uses `secrets: inherit` to access repository
  secrets for cloud authentication
- **OIDC Authentication**: Terraform operations use Azure OIDC authentication
  (ARM_USE_OIDC, ARM_USE_AZUREAD)
- **GitHub Environments**: Uses separate environments for CI and CD phases:
  - `opex-{environment}-ci` for plan operations (read-only)
  - `opex-{environment}-cd` for apply operations (write access)

## Directory Structure

The workflow expects dashboard configs to be located in `.opex/**/config.yaml`
paths. Each config directory should contain (or will receive):

```
.opex/my-api/prod
├── config.yaml          # Dashboard configuration (required)
├── backend.tf           # Terraform backend (generated or manually created)
├── backend.tfvars       # Backend variable values (generated or manually created)
├── opex.tf              # Generated dashboard Terraform (auto-generated)
├── variables.tf         # Variable declarations (auto-generated)
└── terraform.tfvars     # Variable values (auto-generated)
```

## Environment Detection

The workflow automatically extracts the environment name from path. This
environment name is used to:

- Select the appropriate GitHub environment for CI/CD phases:
  - `opex-{environment}-ci` for plan operations
  - `opex-{environment}-cd` for apply operations
- Organize deployed resources by environment

The environment is determined by the dashboard configuration structure and
passed through the `changed_directories` output from the generation job.
