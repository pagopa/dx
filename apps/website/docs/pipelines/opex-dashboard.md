---
sidebar_position: 6
---

# OpEx Dashboard Deployment

Reusable workflow for automatically detecting changes to dashboard configuration
files and their referenced OpenAPI specifications, generating Azure Dashboard
Terraform code, and deploying it to your infrastructure using parallel matrix
strategy.

## Features

- 🔍 **Smart Detection**: Monitors both config files and their referenced
  OpenAPI specs
- 🔄 **Automatic Generation**: Uses `@pagopa/opex-dashboard` to generate
  Terraform
- ⚡ **Parallel Processing**: Generates and deploys multiple dashboards
  concurrently (max 5 parallel)
- 🚀 **Automated Deployment**: Integrates with
  `infra_apply.yaml`/`infra_plan.yaml` for infrastructure deployment
- 🧪 **Dry Run Support**: Run Terraform plan instead of apply for validation
- 🌍 **Flexible Structure**: Supports dashboard configs anywhere in your
  repository

## Architecture

This solution consists of two components:

1. **Reusable Workflow**
   ([opex-dashboard-deploy.yaml](https://github.com/pagopa/dx/blob/main/.github/workflows/opex-dashboard-deploy.yaml)):
   Orchestrates the entire process - checkout, generation, and deployment
2. **Composite Action**
   ([opex-dashboard-generate](https://github.com/pagopa/dx/tree/main/actions/opex-dashboard-generate)):
   Detects changes and generates Terraform code

The workflow is the **primary interface** for users. It handles:

- Repository checkout and Node.js setup
- Calling the action to detect changes and generate Terraform
- Deploying each changed dashboard in parallel via matrix strategy
- Integration with `infra_apply.yaml` or `infra_plan.yaml`

## Usage

### Basic Example: Deploy on Push to Main

```yaml
name: Deploy OpEx Dashboards

on:
  push:
    branches: [main]
    paths:
      - "infra/dashboards/**/config.yaml"
      - "apps/**/openapi.yaml"

jobs:
  deploy:
    uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
    secrets: inherit
    with:
      config_pattern: "infra/dashboards/**/config.yaml"
      github_environment: opex-prod
```

### Dry Run Example: Plan on Pull Requests

```yaml
name: Plan OpEx Dashboards

on:
  pull_request:
    paths:
      - "infra/dashboards/**/config.yaml"
      - "apps/**/openapi.yaml"

jobs:
  plan:
    uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
    secrets: inherit
    with:
      github_environment: opex-dev
      config_pattern: "infra/dashboards/**/config.yaml"
      dry_run: true
```

### Advanced Example: Multiple Environments

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
    with:
      config_pattern: "infra/dashboards/dev/**/config.yaml"
      use_private_agent: true
      github_environment: opex-dev

  deploy-prod:
    if: github.ref == 'refs/heads/main'
    uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
    secrets: inherit
    with:
      config_pattern: "infra/dashboards/prod/**/config.yaml"
      use_private_agent: true
      github_environment: opex-prod
```

## Workflow Inputs

| Input                    | Description                                                                               | Required | Default  |
| ------------------------ | ----------------------------------------------------------------------------------------- | -------- | -------- |
| `github_environment`     | GitHub Environment name                                                                   | Yes      | -        |
| `config_pattern`         | Glob pattern to find dashboard config files (e.g., `infra/dashboards/**/config.yaml`)     | Yes      | -        |
| `dry_run`                | If true, run terraform plan instead of apply                                              | No       | `false`  |
| `node_version`           | Node.js version to use                                                                    | No       | `22`     |
| `opex_dashboard_version` | Version of @pagopa/opex-dashboard to use                                                  | No       | `latest` |
| `base_ref`               | Base git reference for change detection (auto-detects from event context if not provided) | No       | `""`     |
| `use_private_agent`      | Use a private agent to run Terraform operations                                           | No       | `false`  |
| `use_labels`             | Use labels to start environment-specific GitHub runner                                    | No       | `false`  |
| `override_labels`        | Custom runner labels when environment alone is insufficient                               | No       | `""`     |
| `env_vars`               | Additional environment variables in `key=value` format                                    | No       | `""`     |

## Workflow Outputs

The workflow doesn't expose outputs directly. Deployment status can be monitored
through:

- GitHub Actions UI showing matrix job status for each dashboard
- Terraform plan/apply outputs in job logs
- GitHub environment deployment history

## How It Works

### 1. Generation Job

- **Checkout**: Clones repository with full history for change detection
- **Setup Node.js**: Installs Node.js and configures npm caching
- **Detect Base Reference**: Auto-detects `base_ref` from event context (push:
  `github.event.before`, PR: `github.event.pull_request.base.sha`)
- **Call Action**: Invokes the composite action to detect changed configs and
  generate Terraform
- **Extract Directories**: Identifies unique directories containing generated
  `.tf` files and prepares matrix data

### 2. Detection Phase (in Action)

- Compares current HEAD against `base_ref` using `git diff`
- Finds all config files matching `config_pattern` glob
- For each config, checks if:
  - The config file itself changed
  - Referenced OpenAPI spec (via `oa3_spec` field) changed
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

**When `dry_run: false` (default)**:

- Calls `infra_apply.yaml` for each changed dashboard directory in parallel
- Each dashboard runs: Terraform init → plan → apply
- Independent state per dashboard allows safe parallel execution
- Matrix strategy: `fail-fast: false`, `max-parallel: 5`

**When `dry_run: true`**:

- Calls `infra_plan.yaml` instead for validation
- Runs Terraform plan and posts results to PR (if applicable)
- No infrastructure changes applied

### 5. Path Splitting for infra_apply/plan

Each dashboard directory path is split into:

- `base_path`: Parent directories (e.g., `infra/dashboards/issuer`)
- `environment`: Leaf directory name (e.g., `prod`)

These are passed to `infra_apply.yaml`/`infra_plan.yaml` which concatenates them
as `{base_path}/{environment}` to locate Terraform files.

### Concurrency Control

- Workflow-level: `group: ${{ github.workflow }}-opex-dashboards`,
  `cancel-in-progress: false`
- Prevents simultaneous deployments across all dashboards
- Individual dashboard deployments handled by `infra_apply.yaml` concurrency
  groups

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

- **Secrets Inheritance**: Workflow uses `secrets: inherit` to pass repository
  secrets to `infra_apply.yaml`/`infra_plan.yaml`
- **OIDC Authentication**: Terraform operations use Azure/AWS OIDC
  authentication (configured in `infra_apply.yaml`)
- **GitHub Environments**: Supports environment protection rules via
  `github_environment` input (e.g., `prod-ci`, `prod-cd`)
- **Input Validation**:
  - `config_pattern` validated to prevent glob injection attacks
  - `opex_dashboard_version` validated for proper semantic versioning
  - `base_ref` validated before use in git commands
- **Minimal Permissions**:
  - Generation job: `contents: read`
  - Terraform jobs: `id-token: write`, `contents: read` (managed by
    `infra_apply.yaml`)
- **Concurrency Protection**: Prevents concurrent deployments that could cause
  state conflicts

## Directory Structure

The workflow supports **any directory structure** - dashboard configs can be
located anywhere in your repository. The only requirement is that each config
directory should contain (or will receive):

```
path/to/dashboard/
├── config.yaml          # Dashboard configuration
├── backend.tf           # Terraform backend (auto-generated by opex-dashboard or manually created)
├── opex.tf              # Generated dashboard Terraform (auto-generated)
├── boilerplate.tf       # Provider config (auto-generated)
├── variables.tf         # Variable declarations (auto-generated)
└── terraform.tfvars     # Variable values (auto-generated)
```

### Example Structures

**Flat Structure:**

```
infra/
├── issuer-dashboard/
│   ├── config.yaml
│   └── backend.tf
└── wallet-dashboard/
    ├── config.yaml
    └── backend.tf
```

**Environment-based:**

```
infra/dashboards/
├── dev/
│   ├── issuer/config.yaml
│   └── wallet/config.yaml
└── prod/
    ├── issuer/config.yaml
    └── wallet/config.yaml
```

**Service-based:**

```
apps/
├── issuer/
│   ├── openapi.yaml
│   └── infra/dashboard/config.yaml
└── wallet/
    ├── openapi.yaml
    └── infra/dashboard/config.yaml
```

### Path Splitting for Terraform

The workflow splits each dashboard directory path to satisfy
`infra_apply.yaml`'s requirements:

- **Full path**: `infra/dashboards/issuer/prod`
  - `base_path`: `infra/dashboards/issuer`
  - `environment`: `prod`
- **Full path**: `apps/issuer/infra`
  - `base_path`: `apps/issuer`
  - `environment`: `infra`

The leaf directory name becomes the `environment` parameter for Terraform
operations.

## Migration Guide

Migrating from manual OpEx dashboard workflows or the old action-based approach
to the new reusable workflow.

### Prerequisites

- Dashboard `config.yaml` files exist in your repository
- Each config references its OpenAPI spec via `oa3_spec` field
- Each dashboard directory has (or will get) its own `backend.tf` for Terraform
  state

### Migration Steps

1. **Review Current Structure**

   Identify where your dashboard configs are located. The workflow supports any
   structure:

   ```bash
   find . -name "config.yaml" -path "*/dashboard*"
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
         - "**/config.yaml" # Adjust pattern to match your structure
         - "**/openapi.yaml"

   jobs:
     deploy:
       uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
       secrets: inherit
       with:
         github_environment: opex-prod
         config_pattern: "infra/dashboards/**/config.yaml" # Adjust to your structure
         # Add other inputs as needed:
         # use_private_agent: true
   ```

5. **Add Dry-Run Workflow (Optional)**

   For PR validation, add `.github/workflows/opex-dashboards-plan.yaml`:

   ```yaml
   name: Plan OpEx Dashboards

   on:
     pull_request:
       paths:
         - "**/config.yaml"
         - "**/openapi.yaml"

   jobs:
     plan:
       uses: pagopa/dx/.github/workflows/opex-dashboard-deploy.yaml@main
       secrets: inherit
       with:
         github_environment: opex-dev
         config_pattern: "infra/dashboards/**/config.yaml"
         dry_run: true
   ```

6. **Test the Migration**

   ```bash
   # Test generation locally
   npx @pagopa/opex-dashboard@latest generate \
     -c path/to/config.yaml \
     --package path/to/

   # Verify generated files
   ls -la path/to/
   # Should show: config.yaml, opex.tf, backend.tf, variables.tf, etc.

   # Test workflow with dry-run (requires GitHub CLI)
   gh workflow run opex-dashboards-deploy.yaml \
     -f github_environment=opex-dev \
     -f config_pattern="infra/dashboards/**/config.yaml" \
     -f dry_run=true
   ```

### Troubleshooting

**No dashboards detected:**

- Verify `config_pattern` matches your file structure
- Check that OpenAPI specs or configs actually changed in the commit
- Review `base_ref` detection (check workflow logs)

**Path splitting issues:**

- Ensure leaf directory names match your intended `environment`

**Terraform state conflicts:**

- Verify each dashboard has its own `backend.tf` with unique state key
- Check that dashboard directories don't share Terraform resources

**Permission errors:**

- Ensure `secrets: inherit` is set in workflow call
- Verify GitHub environment protection rules are configured
- Check Azure/AWS OIDC credentials in repository secrets
