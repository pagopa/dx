# OpEx Dashboard Generate Action

Automatically detect changes to dashboard configuration files and their referenced OpenAPI specifications, generate updated Azure Dashboard Terraform code, and create a pull request with the changes.

## Features

- 🔍 **Smart Detection**: Monitors both config files and their referenced OpenAPI specs
- 🔄 **Automatic Generation**: Uses `@pagopa/opex-dashboard` to generate Terraform
- ⚡ **Parallel Processing**: Generates multiple dashboards concurrently for improved performance
- 🧪 **Dry Run Support**: Preview changes without creating pull requests

## Usage

```yaml
name: Update OpEx Dashboards

on:
  push:
    branches: [main]
    paths:
      - "infra/dashboards/**/config.yaml"
      - "openapi/**/*.yaml"

permissions:
  contents: write
  pull-requests: write

jobs:
  update-dashboards:
    runs-on: ubuntu-latest
    steps:
      - uses: pagopa/dx/actions/opex-dashboard-generate@main
        with:
          config_pattern: "infra/dashboards/**/config.yaml"
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input                    | Description                                      | Required | Default                                                                |
| ------------------------ | ------------------------------------------------ | -------- | ---------------------------------------------------------------------- |
| `config_pattern`         | Glob pattern to find dashboard config files      | Yes      | -                                                                      |
| `node_version`           | Node.js version to use                           | No       | `22`                                                                   |
| `opex_dashboard_version` | Version of @pagopa/opex-dashboard to use         | No       | `latest`                                                               |
| `pr_title`               | Title for the generated pull request             | No       | `chore: update OpEx dashboards`                                        |
| `pr_body`                | Body for the generated pull request              | No       | `Automated update of dashboard Terraform from OpenAPI specifications.` |
| `base_branch`            | Base branch for the pull request                 | No       | `main`                                                                 |
| `dry_run`                | If true, only detect changes without creating PR | No       | `false`                                                                |
| `github_token`           | GitHub token for creating pull requests          | No       | `${{ github.token }}`                                                  |

## Outputs

| Output               | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `has_changes`        | Whether any dashboard changes were detected (true/false) |
| `changed_dashboards` | JSON array of changed dashboard paths                    |
| `pr_number`          | Number of the created pull request (if any)              |

## How It Works

1. **Detection Phase**: Scans for changes to:
   - Dashboard config files matching the specified pattern
   - OpenAPI specifications referenced by those configs
   - Validates inputs to prevent injection attacks

2. **Generation Phase**: For each changed dashboard:
   - Runs `@pagopa/opex-dashboard generate` in parallel (max 4 concurrent)
   - Outputs Terraform files in the same directory as the config
   - Uses npm caching to improve performance

3. **PR Creation Phase**: If changes are detected and `dry_run` is false:
   - Creates a new branch with a unique name
   - Commits only Terraform-related files
   - Opens a pull request with a summary of changed dashboards

4. **Dry Run Mode**: When enabled:
   - Performs detection and generation
   - Shows a summary of changes that would be committed
   - Skips PR creation

5. **Infrastructure Apply** (after PR merge):
   - Once the PR is merged to `main`, the Terraform CI/CD workflow takes over
   - The workflow should detect changes to `*.tf` files in the dashboard directories
   - Runs `terraform plan` and `terraform apply` to deploy the updated dashboards to Azure
   - This ensures dashboards are automatically provisioned/updated in your Azure environment

## Config File Format

Dashboard config files should reference their OpenAPI specs using the `oa3_spec` field:

```yaml
oa3_spec: ../../openapi/my-service.yaml
dashboard_name: My Service Dashboard
# ... other configuration
```

Both absolute and relative paths are supported for `oa3_spec`.

## Security Considerations

- **Fork Protection**: The action should be used with a job-level condition to prevent execution on forks
- **Permissions**: Requires `contents: write` and `pull-requests: write`
- **Token Scope**: Uses `GITHUB_TOKEN` by default with minimal required permissions
- **Input Validation**:
  - `config_pattern` is validated to prevent glob injection attacks
  - `opex_dashboard_version` is validated to ensure proper semantic versioning format
- **Safe Git Operations**: Only Terraform files (`*.tf`, `*.tf.json`, `*.tfvars`) are committed to prevent accidental inclusion of sensitive files

## Recommended Workflow Setup

### Generation Workflow

This workflow generates Terraform code when dashboard configs or OpenAPI specs change:

```yaml
name: Generate OpEx Dashboards

on:
  push:
    branches: [main]
    paths:
      - "infra/dashboards/**/*.yaml"
      - "infra/openapi/**/*.yaml"

permissions:
  contents: write
  pull-requests: write

jobs:
  generate-dashboards:
    runs-on: ubuntu-latest
    # CRITICAL: Prevent forks from creating PRs
    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.fork == false
    steps:
      - uses: pagopa/dx/actions/opex-dashboard-generate@v1
        with:
          config_pattern: "infra/dashboards/**/config.yaml"
```

### Infrastructure Plan Workflow

When the automated PR is opened, this workflow runs Terraform plan to validate the changes.
Each dashboard has its own Terraform state, so we need to detect which dashboards changed:

```yaml
name: OpEx Dashboards Plan

on:
  pull_request:
    paths:
      - "infra/dashboards/**/*.tf"

jobs:
  detect-changed-dashboards:
    runs-on: ubuntu-latest
    outputs:
      dashboards: ${{ steps.detect.outputs.dashboards }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Detect changed dashboards
        id: detect
        run: |
          # Get list of changed directories under infra/dashboards
          CHANGED_DIRS=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | 
            grep '^infra/dashboards/' | 
            cut -d'/' -f1-3 | 
            sort -u | 
            jq -R -s -c 'split("\n") | map(select(length > 0))')
          echo "dashboards=${CHANGED_DIRS}" >> $GITHUB_OUTPUT

  terraform-plan:
    needs: detect-changed-dashboards
    if: needs.detect-changed-dashboards.outputs.dashboards != '[]'
    strategy:
      matrix:
        dashboard: ${{ fromJson(needs.detect-changed-dashboards.outputs.dashboards) }}
    name: Plan - ${{ matrix.dashboard }}
    uses: pagopa/dx/.github/workflows/infra_plan.yaml@main
    secrets: inherit
    with:
      environment: prod
      base_path: ${{ matrix.dashboard }}
```

### Infrastructure Apply Workflow

After the generated PR is merged, this workflow applies the Terraform changes.
Each dashboard has its own Terraform state:

```yaml
name: OpEx Dashboards Apply

on:
  push:
    branches: [main]
    paths:
      - "infra/dashboards/**/*.tf"

jobs:
  detect-changed-dashboards:
    runs-on: ubuntu-latest
    outputs:
      dashboards: ${{ steps.detect.outputs.dashboards }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Detect changed dashboards
        id: detect
        run: |
          # Get list of changed directories under infra/dashboards
          CHANGED_DIRS=$(git diff --name-only HEAD^1 HEAD | 
            grep '^infra/dashboards/' | 
            cut -d'/' -f1-3 | 
            sort -u | 
            jq -R -s -c 'split("\n") | map(select(length > 0))')
          echo "dashboards=${CHANGED_DIRS}" >> $GITHUB_OUTPUT

  terraform-apply:
    needs: detect-changed-dashboards
    if: needs.detect-changed-dashboards.outputs.dashboards != '[]'
    strategy:
      matrix:
        dashboard: ${{ fromJson(needs.detect-changed-dashboards.outputs.dashboards) }}

    name: Apply - ${{ matrix.dashboard }}
    uses: pagopa/dx/.github/workflows/infra_apply.yaml@main
    secrets: inherit
    with:
      environment: prod
      base_path: ${{ matrix.dashboard }}
```

**Note**:

- Each dashboard directory (e.g., `infra/dashboards/issuer/`, `infra/dashboards/wallet/`) should have its own Terraform state
- The workflows automatically detect which dashboards changed and apply Terraform only to those
- Dashboards are applied in parallel since each has an independent state
- If dashboards share Azure resources that could cause race conditions, consider adding `max-parallel: 1` to the matrix strategy
- Adjust the `environment` parameter based on your infrastructure setup

## Migration Guide

This section provides step-by-step instructions for migrating from existing OpEx dashboard deployment workflows to this action.

The `pagopa` repositories that uses the former workflow approach for OpEx dashboards
can migrate to this action by following these steps.

### Migration Steps

1. **Reorganize Dashboard Configurations**

   Move all dashboard configs to a dedicated `infra/dashboards/` directory.
   Each dashboard should have its own subdirectory with its own Terraform state:

   ```
   infra/dashboards/
   ├── issuer/
   │   ├── config.yaml
   │   ├── ...
   │   └── backend.tf  # Separate state for issuer
   ├── wallet/
   │   ├── config.yaml
   │   ├── ...
   │   └── backend.tf  # Separate state for wallet
   └── verifier/
       ├── config.yaml
       ├── ...
       └── backend.tf  # Separate state for verifier
   ```

2. **Update Dashboard Config Files**

   Ensure each `config.yaml` references the correct OpenAPI spec,
   for example:

   ```yaml
   oa3_spec: apps/issuer/openapi.yaml
   # ... other configuration
   ```

3. **CleanUp Obsolete Workflows**

   Remove any existing workflows related to OpEx dashboard generation and deployment
   to avoid conflicts with the new action-based workflow.

4. **Create OpEx HCL Generation Workflow**

   Add `.github/workflows/opex-dashboards.yaml`:

   ```yaml
   name: Update OpEx Dashboards

   on:
     push:
       branches: [main]
       paths:
         - "infra/dashboards/**/*.yaml"
         - "apps/*/openapi.yaml"

   permissions:
     contents: write
     pull-requests: write

   jobs:
     update-dashboards:
       runs-on: ubuntu-latest
       steps:
         - uses: pagopa/dx/actions/opex-dashboard-generate@v1
           with:
             config_pattern: "infra/dashboards/**/config.yaml"
             github_token: ${{ secrets.GITHUB_TOKEN }}
   ```

5. **Create Terraform Plan/Apply Workflows**

   Add the Terraform plan and apply workflows as described in the
   [Recommended Workflow Setup](#recommended-workflow-setup) section.

6. **Test the Migration**

Example:

```shell
# Test generation locally for a specific dashboard
npx --yes @pagopa/opex-dashboard generate \
  --config infra/dashboards/issuer/config.yaml \
  --output infra/dashboards/issuer/

# Verify the directory structure (each dashboard has its own state)
ls -la infra/dashboards/issuer/
# Should contain: config.yaml, main.tf, backend.tf, etc.

# Trigger workflow manually with dry_run
gh workflow run opex-dashboards.yaml -f dry_run=true
```
