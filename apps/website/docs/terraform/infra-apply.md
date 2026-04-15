---
sidebar_position: 6
---

# Deploying Infrastructure Changes

This document describes the GitHub workflow that automates Terraform apply
operations.

## Overview

The `infra_apply` workflow is part of the Infrastructure as Code (IaC) solution
and is responsible for executing a `terraform apply` to implement infrastructure
changes.

It uses the OIDC authentication provider for Azure and is configured to manage
the application of changes across different environments.

The workflow supports both of these repository layouts under
`<base_path>/<environment>`:

- a single Terraform project directly in the environment directory
- multiple Terraform projects split across first-level subdirectories

This allows one apply pipeline to work for both single-state and multi-state
environments.

## Use Cases

- Implement infrastructure changes in specific environments
- Deploy resources after approval
- Apply only the Terraform projects affected by a change
- Apply all projects in an environment when shared modules change
- Automate infrastructure provisioning

## Input

| Parameter                     | Description                                                                                                                                       | Type    | Req | Default |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --- | ------- |
| `environment`                 | Environment where the resources will be deployed                                                                                                  | string  | ✓   |         |
| `base_path`                   | Base path that contains the environment folders. The workflow inspects `<base_path>/<environment>` and auto-detects flat or multi-project layouts | string  | ✓   |         |
| `env_vars`                    | List of environment variables to set up, given in `env=value` format                                                                              | string  |     |         |
| `use_private_agent`           | Use a private agent to run the Terraform plan                                                                                                     | boolean |     | `false` |
| `override_github_environment` | Set a value if GitHub Environment name is different from the TF environment folder                                                                | string  |     | `''`    |
| `use_labels`                  | Use labels to start the right environment's GitHub runner                                                                                         | boolean |     | `false` |
| `override_labels`             | Needed for special cases where the environment alone is not sufficient as a distinguishing label                                                  | string  |     | `''`    |

## How it Works

The workflow executes the following steps:

1. Determines the Terraform version to use from the `.terraform-version` file
2. Detects the Terraform project roots inside `<base_path>/<environment>`
3. Checks the validity of Terraform registry module locks for each detected
   project
4. Configures the environment and Azure credentials
5. Executes a Terraform plan for each detected project and stores the related
   bundle
6. Downloads the matching plan bundle for each detected project
7. Applies the previously generated Terraform plan

## Project detection rules

The workflow automatically detects which directories must be applied:

- **Flat layout**: if `.tf` files exist directly in `<base_path>/<environment>`,
  that directory is treated as the single Terraform project root.
- **Multi-project layout**: if there are no `.tf` files directly in the
  environment directory, each first-level subdirectory containing changed files
  is treated as an independent project root.
- **Shared modules changed**: if files under `<base_path>/_modules` change, the
  workflow applies all Terraform projects in the target environment.
- **Manual runs**: when triggered with `workflow_dispatch`, the workflow scans
  the whole environment and applies all detected projects.

If no Terraform project is detected, the plan and apply jobs are skipped.

## Supported layouts

```text
# Flat layout
infra/resources/prod/
  main.tf
  variables.tf
  outputs.tf

# Multi-project layout
infra/resources/prod/networking/
  main.tf
infra/resources/prod/data/
  main.tf
```

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
      env_vars: ""
      use_private_agent: true
      override_github_environment: pe-prod
      use_labels: true
      override_labels: ""
```

With the example above, the workflow will inspect `infra/resources/prod`:

- if Terraform files exist directly in that folder, it runs a single plan/apply
- otherwise, it runs one plan/apply for each changed first-level subdirectory

## Special configurations (multi environment/multi cloud)

When working with complex infrastructure setups across multiple environments,
you may need to customize how the workflow runs:

- Use `override_github_environment` when your GitHub environments have different
  naming conventions than your Terraform directory structure, like mapping a
  `prod` terraform directory to a `pe-prod` GitHub environment.
- Enable `use_labels` along with `use_private_agent: true` when you need to
  target specific self-hosted runners within specific cloud environments.
  Particularly useful for multi environment projects.
- Set `override_labels` when you need more granular runner selection beyond the
  environment name, such as for region-specific or cloud-specific runners (e.g.,
  "codebuild-prod-project").

These options are particularly useful for projects with complex deployment
strategies across multiple cloud providers or subscriptions.

## Complete Workflow

The typical execution flow in a CI/CD process includes:

1. **Pull Request**: the `infra_plan` workflow is triggered to verify the
   proposed changes
2. **Review & Approval**: reviewers examine the plan output for each affected
   Terraform project and approve the changes
3. **Merge**: after approval, the PR is merged into the main branch
4. **Deploy**: this `infra_apply` workflow is triggered to implement the changes
   in the desired environment, reusing the per-project plan bundles
