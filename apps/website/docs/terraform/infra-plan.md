---
sidebar_position: 5
---

# Reviewing Infrastructure Changes

This page describes the GitHub workflow that automates Terraform plan
operations.

## Overview

The `infra_plan` workflow is part of the Infrastructure as Code (IaC) solution
and is responsible for executing a `terraform plan` to evaluate infrastructure
changes before applying them.

It uses the OIDC authentication provider for Azure and is configured to analyze
changes across different environments.

The workflow supports both of these repository layouts under
`<base_path>/<environment>`:

- a single Terraform project directly in the environment directory
- multiple Terraform projects split across first-level subdirectories

This makes it suitable for both classic single-state environments and
multi-state environments organized by subdirectory.

## Use Cases

- Verify infrastructure resource changes in pull requests
- Review only the Terraform projects affected by a pull request
- Review all projects in an environment when shared modules change
- Identify potential issues during the development process
- Generate a comprehensive report of planned changes

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
5. Executes a Terraform plan for each detected project
6. If executed on a pull request, publishes the plan result as a comment

## Project detection rules

The workflow automatically detects which directories must be planned:
- **Pull requests / change-driven runs**: project roots are derived from the
  changed file list. If files change directly under `<base_path>/<environment>`,
  the environment directory is treated as the Terraform project root. Otherwise,
  each first-level subdirectory containing changed files is treated as an
  independent project root.
- **Shared modules changed**: if files under `<base_path>/_modules` change, the
  workflow scans the target environment and plans all detected Terraform
  projects.
- **Manual runs**: when triggered with `workflow_dispatch`, the workflow scans
  the whole environment and plans all detected projects.

Because pull request detection is based on changed files rather than a full
directory scan, a flat layout is only detected automatically when the changed
files include paths directly under `<base_path>/<environment>`.

If no Terraform project is detected, the plan jobs are skipped.

## Supported layouts

```text
<base_path>/<environment>/
  main.tf
  variables.tf
  outputs.tf

# Multi-project layout
<base_path>/<environment>/networking/
  main.tf
<base_path>/<environment>/data/
infra/resources/dev/data/
  main.tf
```

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
      env_vars: ""
      use_private_agent: true
      override_github_environment: pe-prod
      use_labels: true
      override_labels: ""
```

With the example above, the workflow will inspect `infra-pe/resources/prod`:

- if Terraform files exist directly in that folder, it runs a single plan
- otherwise, it runs one plan for each changed first-level subdirectory

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

## Best Practices

- Use this workflow for all infrastructure changes
- Keep each Terraform state in a dedicated first-level subdirectory when working
  with multi-state environments
- Carefully review Terraform plans before proceeding with application
