# OpEx Dashboard Generate Action

Automatically detect changes to dashboard configuration files and their referenced OpenAPI specifications, generate updated Azure Dashboard Terraform code, and create a pull request with the changes.

## Features

- 🔍 **Smart Detection**: Monitors both config files and their referenced OpenAPI specs
- 🔄 **Automatic Generation**: Uses `@pagopa/opex-dashboard` to generate Terraform
- ⚡ **Parallel Processing**: Generates multiple dashboards concurrently for improved performance
- 💾 **NPM Caching**: Caches npm packages to speed up subsequent runs
- 🤖 **PR Automation**: Creates pull requests with detailed change summaries
- 🔒 **Fork Protection**: Automatically skips execution on forked repositories
- 🛡️ **Security Hardened**: Input validation and safe git operations to prevent injection attacks
- 🧪 **Dry Run Support**: Preview changes without creating pull requests

## Usage

### Basic Example

```yaml
name: Update OpEx Dashboards

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
  update-dashboards:
    runs-on: ubuntu-latest
    # Prevent forks from creating PRs
    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.fork == false
    steps:
      - uses: pagopa/dx/actions/opex-dashboard-generate@main
        with:
          config_pattern: "infra/dashboards/**/config.yaml"
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Example

```yaml
name: Update OpEx Dashboards

on:
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Run without creating PR"
        type: boolean
        default: false

permissions:
  contents: write
  pull-requests: write

jobs:
  update-dashboards:
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.fork == false
    steps:
      - uses: pagopa/dx/actions/opex-dashboard-generate@v1
        with:
          config_pattern: "infra/dashboards/**/config.yaml"
          opex_dashboard_version: "1.2.3"
          pr_title: "chore(dashboards): update OpEx dashboards"
          pr_body: |
            Automated update of Azure Dashboard Terraform configurations.

            Please review the generated changes carefully.
          base_branch: "main"
          dry_run: ${{ inputs.dry_run || false }}
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

```yaml
permissions:
  contents: write
  pull-requests: write

jobs:
  update-dashboards:
    runs-on: ubuntu-latest
    # CRITICAL: Prevent forks from creating PRs
    if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.fork == false
    steps:
      - uses: pagopa/dx/actions/opex-dashboard-generate@v1
        with:
          config_pattern: "infra/dashboards/**/config.yaml"
```

## License

MIT © PagoPA S.p.A.
