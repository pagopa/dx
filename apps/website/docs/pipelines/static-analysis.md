---
sidebar_position: 1
sidebar_label: Static Analysis for Terraform
---

# Static Analysis for Terraform

The [Static Analysis workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/static_analysis.yaml) performs static validation of Terraform code using pre-commit hooks to ensure quality, compliance, and consistency of infrastructure code.

:::note

This workflow uses [pre-commit](https://pre-commit.com/) and Anton Babenko's [pre-commit-terraform](https://github.com/antonbabenko/pre-commit-terraform) Docker image to run quality checks on Terraform code.

:::

## How It Works

The workflow runs a series of static checks on Terraform code through pre-commit hooks. These checks may include:

- Code formatting (`terraform fmt`)
- Syntax validation (`terraform validate`)
- Best practice checking with `tflint`
- Documentation verification
- Management of Terraform module locks

The workflow can be configured to run checks on all files, only on files modified in a PR, or on a specific folder, offering flexibility in continuous integration.

If changes in Terraform modules are detected, the workflow provides detailed instructions on how to update the module lock files.

## Usage

To use the Static Analysis workflow, reference it as a reusable workflow in your repository. Below is an example configuration:

```yaml
name: Static Analysis

on:
  pull_request:
    paths:
      - "infra/**"
      - ".github/workflows/static_analysis.yaml"

jobs:
  static_analysis:
    uses: pagopa/dx/.github/workflows/static_analysis.yaml@main
    name: Static Analysis
    with:
      # Optional parameters
      enable_modified_files_detection: true
      # folder: "infra/resources/dev"
      # verbose: true
```

## Configuration Parameters

The workflow accepts the following input parameters:

- **terraform_version**: Terraform version to use. If not specified, it is automatically detected from the `.terraform-version` file.
- **pre_commit_tf_tag**: Pre-commit Terraform TAG to use (format: `vX.Y.Z@sha256:000...N`). If not specified, it is automatically detected from the `.pre-commit-config.yaml` file.
- **enable_modified_files_detection**: If enabled, runs pre-commit only on files modified in the PR. The default value is `false`.
- **check_to_run**: If specified, runs only the indicated pre-commit check. Otherwise, all checks are run.
- **folder**: If specified, runs pre-commit only on the indicated folder. Otherwise, it is run on all files.
- **verbose**: If enabled, displays detailed logs of pre-commit checks.
- **fail_on_error**: If `true`, the workflow fails if pre-commit checks fail. The default value is `true`.

## Output and Reports

The workflow automatically generates a detailed report on GitHub with:

- Statistics on detected Terraform modules (total, new, modified, removed)
- Instructions on how to update module locks when changes are detected
- Detailed logs of the pre-commit execution

## Integration with Other Workflows

This workflow is commonly used as a prerequisite in infrastructure plan and apply workflows to ensure that Terraform modules locks are updated. It can be seen in action in the [infra_plan.yaml](https://github.com/pagopa/dx/blob/main/.github/workflows/infra_plan.yaml) and [infra_apply.yaml](https://github.com/pagopa/dx/blob/main/.github/workflows/infra_apply.yaml) workflows.
