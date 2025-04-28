---
sidebar_label: Plan terraform configurations in CI
---

# Workflow Infra Plan

This page describes the GitHub workflow that automates Terraform plan operations.

## Overview

The `infra_plan` workflow is part of the Infrastructure as Code (IaC) solution and is responsible for executing a `terraform plan` to evaluate infrastructure changes before applying them.

It uses the OIDC authentication provider for Azure and is configured to analyze changes across different environments.

## Use Cases

- Verify infrastructure resource changes in pull requests
- Identify potential issues during the development process
- Generate a comprehensive report of planned changes

## Input

| Name | Description | Type | Required | Default |
|------|-------------|------|------------|---------|
| `environment` | Environment where the resources will be deployed | string | ✓ | |
| `base_path` | Base path where to look for Terraform projects | string | ✓ | |
| `env_vars` | List of environment variables to set up, given in `env=value` format | string | | |
| `use_private_agent` | Use a private agent to run the Terraform plan | boolean | | `false` |
| `override_github_environment` | Set a value if GitHub Environment name is different from the TF environment folder | string | | `''` |
| `use_labels` | Use labels to start the right environment's GitHub runner | boolean | | `false` |
| `override_labels` | Needed for special cases where the environment alone is not sufficient as a distinguishing label | string | | `''` |

## How it Works

The workflow executes the following steps:

1. Determines the Terraform version to use from the `.terraform-version` file
2. Checks the validity of terraform modules locks
3. Configures the environment and Azure credentials
4. Executes a Terraform plan
5. If executed on a pull request, publishes the plan result as a comment

## Usage Example

```yaml
jobs:
  infra_plan:
    uses: pagopa/dx/.github/workflows/infra_plan.yaml@main
    name: Infra plan
    secrets: inherit
    with:
      environment: prod
      base_path: infra-pe/resources
      # Optional parameters
      env_vars: ''
      use_private_agent: true
      override_github_environment: pe-prod
      use_labels: true
      override_labels: ''
```

## Special configurations (multi environment/multi cloud)

When working with complex infrastructure setups across multiple environments, you may need to customize how the workflow runs:

- Use `override_github_environment` when your GitHub environments have different naming conventions than your Terraform directory structure, like mapping a `prod` terraform directory to a `pe-prod` GitHub environment.
- Enable `use_labels` along with `use_private_agent: true` when you need to target specific self-hosted runners within specific cloud environments. Particularly useful for multi environment projects.
- Set `override_labels` when you need more granular runner selection beyond the environment name, such as for region-specific or cloud-specific runners (e.g., "codebuild-prod-project").

These options are particularly useful for projects with complex deployment strategies across multiple cloud providers or subscriptions.

## Best Practices

- Use this workflow for all infrastructure changes
- Carefully review Terraform plans before proceeding with application
