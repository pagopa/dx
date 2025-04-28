---
sidebar_label: Infra Apply
---

# Workflow Infra Apply

This document describes the GitHub workflow that automates Terraform apply operations.

## Overview

The `infra_apply` workflow is part of the Infrastructure as Code (IaC) solution and is responsible for executing a `terraform apply` to implement infrastructure changes.

It uses the OIDC authentication provider for Azure and is configured to manage the application of changes across different environments.

## Use Cases

- Implement infrastructure changes in specific environments
- Deploy resources after approval
- Automate infrastructure provisioning

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
4. Executes a Terraform plan and saves it as an artifact
5. Asks for approval to proceed with the apply operation
6. If approved, applies the previously generated Terraform plan

## Usage Example

```yaml
jobs:
  apply_infra:
    uses: pagopa/dx/.github/workflows/infra_apply.yaml@main
    secrets: inherit
    with:
      environment: prod
      base_path: infra/resources
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


## Complete Workflow

The typical execution flow in a CI/CD process includes:

1. **Pull Request**: the `infra_plan` workflow is triggered to verify the proposed changes
2. **Review & Approval**: reviewers examine the plan and approve the changes
3. **Merge**: after approval, the PR is merged into the main branch
4. **Deploy**: this `infra_apply` workflow is triggered to implement the changes in the desired environment
