# OpEx Dashboard Generate Action

This composite GitHub Action detects changes to dashboard configuration files and their referenced OpenAPI specifications, then generates Azure Dashboard Terraform code.

## Overview

This action is the detection and generation component of the OpEx Dashboard solution. For the complete workflow including deployment, see the [OpEx Dashboard Deployment documentation](https://dx.pagopa.it/docs/pipelines/opex-dashboard/).

The action performs two main functions:

1. **Detection**: Identifies which dashboard configs and their OpenAPI specs have changed
2. **Generation**: Automatically generates Terraform files using `@pagopa/opex-dashboard`

## Inputs

| Input                    | Description                                                                                | Required |
| ------------------------ | ------------------------------------------------------------------------------------------ | -------- |
| `config_pattern`         | Glob pattern(s) to find dashboard config files (supports multiple patterns, one per line)  | Yes      |
| `opex_dashboard_version` | Version of @pagopa/opex-dashboard to use                                                   | No       |
| `base_ref`               | Base git reference for change detection. Leave empty for auto-detection from event context | No       |

## Outputs

| Output                | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `has_changes`         | Whether any dashboard changes were detected (boolean)          |
| `changed_dashboards`  | JSON array of changed dashboard config paths                   |
| `changed_directories` | JSON array of directories containing generated Terraform files |
| `artifacts_path`      | Path to collected Terraform artifacts directory (for upload)   |

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
    # base_ref is auto-detected from github event context when omitted

- name: Upload artifacts
  if: steps.generate-action.outputs.has_changes == 'true'
  uses: actions/upload-artifact@v4
  with:
    name: generated-terraform
    path: ${{ steps.generate-action.outputs.artifacts_path }}
```

## Architecture

The action consists of five shell scripts:

- **resolve-base-ref.sh**: Resolves the base git reference (auto-detects from event context or uses provided value)
- **detect-changes.sh**: Finds modified config files and their referenced OpenAPI specs
- **generate-terraform.sh**: Runs `@pagopa/opex-dashboard` to generate Terraform
- **extract-directories.sh**: Formats generated Terraform directories for matrix deployment
- **collect-artifacts.sh**: Collects generated files into a staging directory for artifact upload

### Cross-Platform Compatibility

The scripts require bash and standard GNU/Linux tools (`find`, `grep`, `sed`, `git`, `jq`, `awk`). They are designed to run on GitHub Actions Ubuntu runners.

## Documentation

For comprehensive documentation including:

- Complete workflow examples
- Configuration file format
- Security considerations
- Directory structure guidelines
- Migration guide from legacy workflows
- Troubleshooting

Please visit the [OpEx Dashboard Deployment documentation](https://dx.pagopa.it/docs/pipelines/opex-dashboard/).
