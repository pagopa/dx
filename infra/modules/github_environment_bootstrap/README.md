# github_environment_bootstrap
## Overview

The `github_environment_bootstrap` module simplifies the process of creating and configuring GitHub repositories. It ensures consistency and compliance with organizational standards.

For more information on setting up and managing infrastructure in a monorepository, refer to the [DX Monorepository Setup Guide](https://pagopa.github.io/dx/docs/infrastructure/monorepository-setup).

### Features

- Automates the creation and configuration of GitHub repositories.
- Sets up default branches and enforces branch protection rules.
- Integrates with Jira by adding autolink references for specified boards.
- Allows customization of repository topics and descriptions.

### Usage Example

```hcl
module "github_environment_bootstrap" {
  source = "./modules/github_environment_bootstrap"

  repository = {
    name                = "example-repo"
    description         = "An example repository"
    topics              = ["terraform", "github", "automation"]
    default_branch_name = "main"
    jira_boards_ids     = ["CES", "CAI"]
  }#
}
```

This example demonstrates how to use the module to create a GitHub repository with a custom name, description, topics, and Jira board integrations.

For additional support, refer to the [GitHub Provider Documentation](https://registry.terraform.io/providers/integrations/github/latest/docs).

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_github"></a> [github](#requirement\_github) | ~> 6.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [github_branch_default.main](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_default) | resource |
| [github_branch_protection.main](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection) | resource |
| [github_repository.this](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository) | resource |
| [github_repository_autolink_reference.jira_board](https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_autolink_reference) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_repository"></a> [repository](#input\_repository) | Information about this repository | <pre>object({<br/>    name                = string<br/>    description         = string<br/>    topics              = list(string)<br/>    default_branch_name = optional(string, "main")<br/>    jira_boards_ids     = optional(list(string), [])<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
<!-- END_TF_DOCS -->
