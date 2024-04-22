# DX

DevEx repository for shared tools and pipelines.

- [DX](#dx)
  - [GitHub Action Templates](#github-action-templates)
    - [infra\_plan.yaml](#infra_planyaml)
      - [What it does](#what-it-does)
      - [Example](#example)
      - [Requirements](#requirements)
    - [infra\_apply.yaml](#infra_applyyaml)
      - [What it does](#what-it-does-1)
      - [Requirements](#requirements-1)
  - [Terraform Modules](#terraform-modules)
    - [GitHub SelfHosted Runner on Container App job](#github-selfhosted-runner-on-container-app-job)

## GitHub Action Templates

### infra_plan.yaml

As a `workflow_call`, this action should be invoked and used as template by other GitHub Actions to validate Pull Requests containing Terraform code changes. It provides all job steps that must be run to validate a Terraform configuration, and includes the job properties configuration as well.

#### What it does

This template is useful to validate Pull Requests with Terraform code changes. It is also suggested to run the workflow everytime the PR code changes only if the PR status is ready (no drafts).

The workflow template authenticates with Azure and performs a `terraform plan` command to validate the changes.

Ultimately, it prints out a comment in the PR view with the plan output. In case of multiple executions, it updates the previous comment with the latest changes.

It supports optional input with the agent it should run on (GitHub managed or not), or custom environment variables.

#### Example

An example of its use can be found [here](https://github.com/pagopa/dx-typescript/blob/main/.github/workflows/pr_infra.yaml).
It is recommended to stick to the same naming conventions shown in the example.

#### Requirements

This workflow template leverages on managed identities to authenticate with Azure. Managed identities can be easily created through the module `azure_federated_identity_with_github` available in this repository.

Terraform definitions are intended to work for an environment in a specific region. Each pair environment/region is a Terraform project on its own and they will be located in the `<env>/<region>` subfolder. Every automation will expect resources to be in such folders.

### infra_apply.yaml

As a `workflow_call`, this action should be invoked and used as template by other GitHub Actions to deploy infrastructure changes after a PR have been merged. It provides all job steps that must be run to apply a Terraform configuration, and includes the job properties configuration as well.

#### What it does

This template is useful to deploy Terraform code changes. It is also suggested to run the workflow everytime a PR is merged in the `main` branch.

The workflow authenticates with Azure and perform a `terraform plan` to inform the user about the next changes. If there aren't any unexpected change, the user can approve the second step of the workflow and apply them.

**Note**: the deployment approval step must be configured at GitHub repositiory level, by changing settings of the `<env>-cd` environment. Otherwise, the deployment is done automatically.

This workflow is set to be run once per time, abolishing concurrent runs.

#### Requirements

This workflow template leverages on managed identities to authenticate with Azure. Managed identities can be easily created through the module `azure_federated_identity_with_github` available in this repository.

Terraform definitions are intended to work for an environment in a specific region. Each pair environment/region is a Terraform project on its own and they will be located in the `<env>/<region>` subfolder. Every automation will expect resources to be in such folders.

## Terraform Modules

### GitHub SelfHosted Runner on Container App job

This module creates a Container App Job on an existing Container App Environment. It requires your repository name as input, in order to create a trigger on the GitHub Actions status of that repository. Moreover, it has a dependencies on a KeyVault where it creates a read-only access policy to access secrets.

N.B. If you are adding a new Container App Job, it is likely that your repository must be added to GITHUB PAT access scope. Ask for this one-time operation to `engineering-team-cloud-eng` team.
