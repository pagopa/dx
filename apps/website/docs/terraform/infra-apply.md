---
sidebar_position: 6
---

# Deploying Infrastructure Changes

:::info Reusable Workflows

| Workflow                              | Version | Source                                                                                                            |
| ------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| **Infrastructure Apply**              | latest  | [`infra_apply.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/infra_apply.yaml)                   |
| **Nx Terraform Infrastructure Apply** | latest  | [`release-terraform-v1.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/release-terraform-v1.yaml) |

:::

This document describes the GitHub workflows that automate Terraform apply
operations.

## Choose an apply workflow

The two workflows are alternatives, not steps of one flow. Use the one that
matches whether the target repository adopts Nx, and do not combine them.

| Repository                          | Workflow                                                                                                      | Terraform projects are found by                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Does not use Nx                     | [Infrastructure Apply](#infrastructure-apply-without-nx) (`infra_apply.yaml`)                                 | Folder layout and changed files under `<base_path>/<environment>` |
| Uses Nx with `@pagopa/nx-terraform` | [Nx Terraform Infrastructure Apply](#nx-terraform-infrastructure-apply-with-nx) (`release-terraform-v1.yaml`) | Nx projects tagged `terraform` that are affected by the change    |

Keep using `infra_apply.yaml` for the current Terraform flow that creates,
stores, downloads, and applies Terraform plan bundles without relying on Nx
project discovery.

## Infrastructure Apply (without Nx)

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

The current `infra_apply` workflow executes the following steps:

1. Determines the Terraform version to use from the `.terraform-version` file
2. Detects the Terraform project roots inside `<base_path>/<environment>`
3. Checks the validity of Terraform registry module locks for each detected
   project
4. Configures the environment and CSP credentials
5. Executes a Terraform plan for each detected project and stores the related
   bundle
6. Downloads the matching plan bundle for each detected project
7. Applies the previously generated Terraform plan

## Project detection rules

The current workflow automatically detects which directories must be applied:

- **Flat layout**: if Terraform files exist directly in
  `<base_path>/<environment>`, that directory is treated as the single Terraform
  project root. This detection applies when:
  - `workflow_dispatch` is triggered (full directory scan)
  - Shared modules change (full environment scan)
- **Multi-project layout**: if there are no Terraform files directly in the
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

## Nx Terraform Infrastructure Apply (with Nx)

Use `release-terraform-v1.yaml` as the repository-level release workflow for
repositories that manage Terraform projects through Nx and
`@pagopa/nx-terraform`. Like `_validate.yaml`, this wrapper only invokes the
versioned reusable workflow implementation.

The masked plan/apply targets require `@pagopa/nx-terraform` 0.6.0 or newer,
which bundles the shared task implementations. Update the consuming repository's
dependency lockfile before adopting this flow.

`release-terraform-v1.yaml` contains the release logic and follows the same
environment discovery approach used by `validate-v2.yaml`: it reads the
repository GitHub environments named `infra-<env>-cd` (and the paired
`infra-<env>-ci` used for planning), and checks which Terraform Nx projects are
affected for each environment.

Projects under `infra/bootstrapper/` and the `infra/repository` project are the
exception. They use the paired `bootstrapper-<env>-ci` environment for planning
and `bootstrapper-<env>-cd` for apply, because those environments hold the
GitHub App secrets (`GH_APP_*`) needed by the GitHub provider. Their approval
rules are those of the `bootstrapper-<env>-cd` environment, not
`infra-<env>-cd`. All other projects keep using `infra-<env>-ci` and
`infra-<env>-cd`.

Like the current `infra_apply` workflow, releases follow a **Plan → Approve →
Apply** flow, so the plan a reviewer approves is what gets applied:

1. **Plan** (`release-plan`): runs on the matching self-hosted runner label,
   under the `infra-<env>-ci` GitHub environment (or `bootstrapper-<env>-ci` for
   the bootstrapper and repository projects; no required reviewers). Runs the
   Terraform Nx `plan` target for each affected project and uploads the
   resulting plan bundle to the same storage backend used for the Terraform
   state.
2. **Apply** (`release-apply`): runs under the `infra-<env>-cd` GitHub
   environment (or `bootstrapper-<env>-cd` for the bootstrapper and repository
   projects), so any required reviewers configured on it must approve the run
   before it proceeds. Downloads the plan bundle uploaded by `release-plan` and
   runs the Terraform Nx `apply` target against that exact plan file, instead of
   recomputing a new plan.

If no matching Nx project is found, both jobs are skipped.

The complete release is serialized through planning, approval and apply. Active
runs are never cancelled. Only one run remains pending; a newer run replaces the
pending one and generates its plan after the active release ends. The queue does
not guarantee commit order.

When migrating to this wrapper, remove the push triggers from the legacy callers
that deploy the same states. In this repository, the dev, uat and prod legacy
resource callers remain available only through `workflow_dispatch`. Do not run
both deployment flows concurrently against the same state.

```yaml
jobs:
  release:
    permissions:
      contents: read
      actions: read
      id-token: write
    uses: pagopa/dx/.github/workflows/release-terraform-v1.yaml@main
    secrets: inherit
```

## Complete Workflow

The typical execution flow in a CI/CD process includes:

1. **Pull Request**: the `infra_plan` workflow is triggered to verify the
   proposed changes
2. **Review & Approval**: reviewers examine the plan output for each affected
   Terraform project and approve the changes
3. **Merge**: after approval, the PR is merged into the main branch
4. **Deploy**: the apply workflow used by the repository is triggered to
   implement the changes in the desired environment: `infra_apply` without Nx,
   or `release-terraform-v1` with Nx
