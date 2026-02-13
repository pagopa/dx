---
sidebar_position: 6
---

# Deploy OpEx Dashboards

Reusable workflow for automatically detecting changes to dashboard configuration
files and their referenced OpenAPI specifications, generating Azure Dashboard
Terraform code, and deploying it to your infrastructure using parallel matrix
strategy.

## Features

- 🔍 **Smart Detection**: Monitors both config files and their referenced
  OpenAPI specs with automatic base reference detection
- 🔄 **Automatic Generation**: Uses `@pagopa/opex-dashboard` to generate
  Terraform code
- ⚡ **Parallel Processing**: Deploys up to 5 dashboards in parallel with matrix
  strategy
- 🚀 **Integrated Deployment**: Handles complete Terraform lifecycle (plan and
  apply) with separate CI/CD environments
- 🔒 **Secure by Default**: Uses Azure OIDC, GitHub environments, and encrypted
  plan artifacts
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

The workflow is the **primary interface** for users. It handles:

- Repository checkout with full history for change detection
- Automatic base reference detection from event context
- Calling the action to detect changes and generate Terraform
- Running Terraform plan in CI environment for each changed dashboard
- Deploying each changed dashboard in CD environment via matrix strategy
- Artifact management for generated files and plan outputs

## Usage

### Basic Example: Deploy on Push to Main

```yaml
name: Deploy OpEx Dashboards

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

### Example: Plan on Pull Requests

```yaml
name: Plan OpEx Dashboards

on:
  pull_request:
    paths:
      - ".opex/**/config.yaml"
      - "**/openapi.yaml"

jobs:
  plan:
    uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
    secrets: inherit
```

### Advanced Example: Multiple Environments with Private Agent

```yaml
name: Deploy OpEx Dashboards

on:
  push:
    branches: [main, develop]

jobs:
  deploy-dev:
    if: github.ref == 'refs/heads/develop'
    uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
    secrets: inherit

  deploy-prod:
    if: github.ref == 'refs/heads/main'
    uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
    secrets: inherit
```

## Workflow Outputs

The workflow doesn't expose outputs directly. Deployment status can be monitored
through:

- GitHub Actions UI showing matrix job status for each dashboard
- Terraform plan outputs in the `tf_plan` job logs
- Terraform apply outputs in the `tf_apply` job logs
- GitHub environment deployment history for CI and CD phases
- Uploaded artifacts: `generated-terraform` and plan files

## How It Works

### 1. Generation Job

- **Checkout**: Clones repository with full history for change detection
- **Setup Node.js**: Installs Node.js and configures npm caching
- **Detect Base Reference**: Automatically detects `base_ref` from event
  context:
  - Pull requests: Uses `github.event.pull_request.base.sha`
  - Push events: Uses `github.event.before` (if valid)
  - Fallback: Uses `HEAD~1` or `origin/{default_branch}`
- **Call Action**: Invokes the composite action to detect changed configs and
  generate Terraform
- **Collect Files**: Gathers generated Terraform files and uploads as artifacts

### 2. Detection Phase (in Action)

- Compares current HEAD against `base_ref` using `git diff`
- Finds all config files matching `.opex/**/config.yaml` glob
- For each config, checks if:
  - The config file itself changed
  - Referenced OpenAPI spec (via `oa3_spec` field) changed
- Includes added/copied/modified/renamed files; excludes deleted files from
  generation targets
- Validates inputs to prevent injection attacks
- Outputs JSON array of changed dashboard configs

### 3. Generation Phase (in Action)

- For each changed dashboard config:
  - Runs `npx @pagopa/opex-dashboard generate` in parallel (max 4 concurrent)
  - Generates Terraform files (`.tf`, `backend.tf`, `variables.tf`, etc.) in
    same directory as config
  - Uses npm caching to improve performance
- Extracts unique directories containing generated Terraform files

### 4. Deployment Phase (Matrix Strategy)

The workflow executes two jobs in sequence for each changed dashboard:

**Terraform Plan Job (`tf_plan`)**:

- Runs for each changed dashboard in parallel (max 5 concurrent)
- Downloads generated Terraform files from artifacts
- Executes: Terraform init → plan (with `-lock=false` in CI environment)
- Uploads encrypted plan file for the apply phase
- Uses environment: `opex-{dashboard.environment}-ci`

**Terraform Apply Job (`tf_apply`)**:

- Runs after successful plan for each dashboard
- Downloads generated Terraform files and plan artifacts
- Executes: Terraform init → apply (with approved plan)
- Uses environment: `opex-{dashboard.environment}-cd`
- Matrix strategy: `fail-fast: false`, `max-parallel: 5`

Each dashboard has independent state, allowing safe parallel execution.

### Concurrency Control

- Workflow-level: `group: ${{ github.workflow }}-opex-dashboards`,
  `cancel-in-progress: false`
- Prevents multiple workflow runs from deploying dashboards simultaneously
- Individual dashboards deploy in parallel within a single workflow run (max 5
  concurrent)
- Terraform state locking provides additional protection during apply operations

## Config File Format

Dashboard config files should reference their OpenAPI specs using the `oa3_spec`
field:

```yaml
oa3_spec: ../../openapi/my-service.yaml
dashboard_name: My Service Dashboard
# ... other configuration
```

Both absolute and relative paths are supported for `oa3_spec`.

## Security Considerations

- **Secrets Inheritance**: Workflow uses `secrets: inherit` to access repository
  secrets for cloud authentication
- **OIDC Authentication**: Terraform operations use Azure OIDC authentication
  (ARM_USE_OIDC, ARM_USE_AZUREAD)
- **GitHub Environments**: Uses separate environments for CI and CD phases:
  - `opex-{environment}-ci` for plan operations (read-only)
  - `opex-{environment}-cd` for apply operations (write access)
- **Input Validation**:
  - Git references validated before use in commands
  - Event names validated to prevent injection
- **Minimal Permissions**:
  - Generation job: `contents: read`
  - Plan job: `id-token: write`, `contents: read`, `pull-requests: write`
  - Apply job: `id-token: write`, `contents: read`
- **Concurrency Protection**: Prevents concurrent deployments that could cause
  state conflicts

## Directory Structure

The workflow expects dashboard configs to be located in `.opex/**/config.yaml`
paths. Each config directory should contain (or will receive):

```
.opex/path/to/dashboard/
├── config.yaml          # Dashboard configuration
├── backend.tf           # Terraform backend (auto-generated by opex-dashboard or manually created)
├── backend.tfvars       # Backend variable values (required for terraform init)
├── opex.tf              # Generated dashboard Terraform (auto-generated)
├── boilerplate.tf       # Provider config (auto-generated)
├── variables.tf         # Variable declarations (auto-generated)
└── terraform.tfvars     # Variable values (auto-generated)
```

### Example Structures

**Flat Structure:**

```
.opex/
├── issuer/
│   ├── config.yaml
│   ├── backend.tf
│   └── backend.tfvars
└── wallet/
  ├── config.yaml
  ├── backend.tf
  └── backend.tfvars
```

**Environment-based:**

```
.opex/
├── dev/
│   ├── issuer/config.yaml
│   ├── issuer/backend.tfvars
│   ├── wallet/config.yaml
│   └── wallet/backend.tfvars
└── prod/
  ├── issuer/config.yaml
  ├── issuer/backend.tfvars
  ├── wallet/config.yaml
  └── wallet/backend.tfvars
```

### Environment Detection

The workflow automatically extracts the environment name from the dashboard
metadata provided by the generation action. This environment name is used to:

- Select the appropriate GitHub environment for CI/CD phases:
  - `opex-{environment}-ci` for plan operations
  - `opex-{environment}-cd` for apply operations
- Organize deployed resources by environment

The environment is determined by the dashboard configuration structure and
passed through the `changed_directories` output from the generation job.

## Migration Guide

Migrating from manual OpEx dashboard workflows or the old action-based approach
to the new reusable workflow.

### Prerequisites

- Dashboard `config.yaml` files exist in your repository
- Each config references its OpenAPI spec via `oa3_spec` field
- Dashboard configs used by this reusable workflow are under
  `.opex/**/config.yaml`
- Each dashboard directory has `backend.tfvars` available for `terraform init`

### Migration Steps

1. **Review Current Structure**

Ensure your dashboard configs are under `.opex/**/config.yaml`:

```bash
find . -path './.opex/**/config.yaml'
```

2. **Update Config Files**

   Ensure each `config.yaml` correctly references its OpenAPI spec:

   ```yaml
   oa3_spec: ../../openapi/service.yaml # Relative or absolute path
   # ... other configuration
   ```

3. **Remove Old Workflows**

   Delete existing OpEx-related workflows that manually handle
   generation/deployment:

   ```bash
   rm .github/workflows/opex-*.yaml  # Review before deleting!
   ```

4. **Create New Workflow**

   Add `.github/workflows/opex-dashboard-deploy.yaml`:

   ```yaml
   name: Deploy OpEx Dashboards

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

5. **Add Plan Workflow for PRs (Optional)**

   For PR validation, add `.github/workflows/opex-dashboard-plan.yaml`:

   ```yaml
   name: Plan OpEx Dashboards

   on:
     pull_request:
       paths:
         - ".opex/**/config.yaml"
         - "**/openapi.yaml"

   jobs:
     plan:
       uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
       secrets: inherit
   ```

6. **Test the Migration**

   ```bash
   # Test generation locally
   npx @pagopa/opex-dashboard@latest generate \
     -c path/to/config.yaml \
     --package path/to/

   # Verify generated files
   ls -la path/to/
   ```

# Should show: config.yaml, opex.tf, backend.tf, backend.tfvars, variables.tf, etc.

# Create a test PR to validate the workflow

git checkout -b test/opex-migration git commit --allow-empty -m "test: trigger
OpEx workflow" git push origin test/opex-migration gh pr create --title "Test
OpEx Dashboard Workflow"

```

### Troubleshooting

**No dashboards detected:**

- Verify config files are located in `.opex/**/config.yaml` paths
- Check that OpenAPI specs or configs actually changed in the commit
- Review automatic base reference detection in workflow logs (look for "Using
base reference" message)

**Terraform plan fails:**

- Check that dashboard directory has valid `backend.tfvars`
- Verify Azure credentials and OIDC configuration
- Ensure GitHub environment `opex-{environment}-ci` exists and has proper
secrets

**Terraform apply fails:**

- Review plan output from the previous step
- Check GitHub environment `opex-{environment}-cd` protection rules
- Verify state backend accessibility and lock configuration
```
