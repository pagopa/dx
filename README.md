# DX

DevEx repository for shared tools and pipelines.

- [DX](#dx)
  - [GitHub Action Templates](#github-action-templates)
    - [infra\_plan.yaml](#infra_planyaml)
      - [What it does](#what-it-does)
      - [Example](#example)
      - [Requirements](#requirements)

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
