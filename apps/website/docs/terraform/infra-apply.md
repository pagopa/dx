---
sidebar_position: 6
---

# Deploying Infrastructure Changes

:::info Reusable Workflow

| Workflow                 | Version | Source                                                                                          |
| ------------------------ | ------- | ----------------------------------------------------------------------------------------------- |
| **Infrastructure Apply** | latest  | [`infra_apply.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/infra_apply.yaml) |

:::

This document describes the GitHub workflow that automates Terraform apply
operations.

## Overview

The `infra_apply` workflow is part of the Infrastructure as Code (IaC) solution
and is responsible for executing the Nx `apply` target for Terraform projects to
implement infrastructure changes.

It uses the OIDC authentication provider for Azure and is configured to manage
the application of changes across different environments.

The workflow supports both of these repository layouts under
`<base_path>/<environment>`:

- a single Terraform project directly in the environment directory
- multiple Terraform projects split across first-level subdirectories

This allows one apply pipeline to work for both single-state and multi-state
environments. The repository must configure `@pagopa/nx-terraform-plugin` so
that these directories are discovered as Nx Terraform application projects.

## Use Cases

- Implement infrastructure changes in specific environments
- Deploy resources after approval
- Apply all Nx Terraform projects in an environment
- Automate infrastructure provisioning

## Input

| Parameter                     | Description                                                                                                                                            | Type    | Req | Default |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --- | ------- |
| `environment`                 | Environment where the resources will be deployed                                                                                                       | string  | ✓   |         |
| `base_path`                   | Base path that contains the environment folders. The workflow selects Nx application projects with an `apply` target below `<base_path>/<environment>` | string  | ✓   |         |
| `env_vars`                    | List of environment variables to set up, given in `env=value` format                                                                                   | string  |     |         |
| `use_private_agent`           | Use a private agent to run the Terraform apply                                                                                                         | boolean |     | `false` |
| `override_github_environment` | Set a value if GitHub Environment name is different from the TF environment folder                                                                     | string  |     | `''`    |
| `use_labels`                  | Use labels to start the right environment's GitHub runner                                                                                              | boolean |     | `false` |
| `override_labels`             | Needed for special cases where the environment alone is not sufficient as a distinguishing label                                                       | string  |     | `''`    |

## How it Works

The workflow executes the following steps:

1. Determines the Terraform version to use from the `.terraform-version` file
2. Installs the repository dependencies required by Nx
3. Configures the environment and CSP credentials
4. Finds Nx Terraform application projects with an `apply` target below
   `<base_path>/<environment>`
5. Runs their Nx `apply` target with Terraform's non-interactive apply options

## Project selection rules

The workflow asks Nx to select Terraform application projects that:

- are located under `<base_path>/<environment>`
- expose the inferred `apply` target from `@pagopa/nx-terraform-plugin`

This covers both layouts:

- **Flat layout**: the environment directory is the Terraform project root.
- **Multi-project layout**: each first-level subdirectory in the environment
  directory is an independent Terraform project root.

If no matching Nx project is found, the apply step is skipped.

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

With the example above, the workflow will ask Nx for Terraform application
projects with an `apply` target under `infra/resources/prod`:

- if that folder is a Terraform project, it runs one Nx apply target
- otherwise, it runs the target for each Terraform project in its subdirectories

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

1. **Pull Request**: the Nx validation pipeline verifies the proposed changes
2. **Review & Approval**: reviewers examine the plan output for each affected
   Terraform project and approve the changes
3. **Merge**: after approval, the PR is merged into the main branch
4. **Deploy**: this `infra_apply` workflow runs the Nx apply target for the
   desired environment
