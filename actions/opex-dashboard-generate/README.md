# OpEx Dashboard Generate Action

This composite GitHub Action detects changes to dashboard configuration files and their referenced OpenAPI specifications, then generates Azure Dashboard Terraform code.

## Overview

This action is the detection and generation component of the OpEx Dashboard solution. For the complete workflow including deployment, see the [OpEx Dashboard Deployment documentation](https://dx.pagopa.it/docs/pipelines/opex-dashboard/).

The action performs two main functions:

1. **Detection**: Identifies which dashboard configs and their OpenAPI specs have changed
2. **Generation**: Automatically generates Terraform files using `@pagopa/opex-dashboard`

## Inputs

| Input                    | Description                                                                               | Required |
| ------------------------ | ----------------------------------------------------------------------------------------- | -------- |
| `config_pattern`         | Glob pattern(s) to find dashboard config files (supports multiple patterns, one per line) | Yes      |
| `opex_dashboard_version` | Version of @pagopa/opex-dashboard to use                                                  | No       |
| `base_ref`               | Base git reference for change detection (commit SHA or ref)                               | Yes      |

## Outputs

| Output                | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `has_changes`         | Whether any dashboard changes were detected (boolean)          |
| `changed_dashboards`  | JSON array of changed dashboard config paths                   |
| `changed_directories` | JSON array of directories containing generated Terraform files |

## Usage

This action is typically used within the [opex-dashboard-deploy workflow](https://dx.pagopa.it/docs/pipelines/opex-dashboard/). For detailed usage examples and complete documentation, visit the [OpEx Dashboard Deployment guide](https://dx.pagopa.it/docs/pipelines/opex-dashboard/).

### Quick Example

```yaml
- name: Generate dashboards
  id: generate-action
  uses: pagopa/dx/actions/opex-dashboard-generate@main
  with:
    config_pattern: "infra/dashboards/**/config.yaml"
    opex_dashboard_version: "latest"
    base_ref: ${{ github.event.pull_request.base.sha }}
```

## Architecture

The action consists of three shell scripts:

- **detect-changes.sh**: Finds modified config files and their referenced OpenAPI specs
- **generate-terraform.sh**: Runs `@pagopa/opex-dashboard` to generate Terraform
- **extract-directories.sh**: Formats generated Terraform directories for matrix deployment

### Cross-Platform Compatibility

The scripts are designed to work on both GNU/Linux (GitHub Actions runners) and BSD-based systems (macOS):

- Path normalization uses a fallback mechanism that works without the GNU-specific `realpath -m` flag
- All scripts are compatible with both POSIX-compliant shells and bash

For local testing on macOS, ensure you have basic POSIX tools available (`bash`, `find`, `grep`, `sed`, `git`, `jq`). Optional tools like `yq` provide enhanced parsing but have graceful fallbacks.

## Documentation

For comprehensive documentation including:

- Complete workflow examples
- Configuration file format
- Security considerations
- Directory structure guidelines
- Migration guide from legacy workflows
- Troubleshooting

Please visit the [OpEx Dashboard Deployment documentation](https://dx.pagopa.it/docs/pipelines/opex-dashboard/).
