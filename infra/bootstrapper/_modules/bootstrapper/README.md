# bootstrapper

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azuread"></a> [azuread](#provider\_azuread) | 3.4.0 |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.35.0 |
| <a name="provider_github"></a> [github](#provider\_github) | 6.6.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_bootstrap"></a> [bootstrap](#module\_bootstrap) | pagopa-dx/azure-github-environment-bootstrap/azurerm | ~> 2.0 |
| <a name="module_core_values"></a> [core\_values](#module\_core\_values) | pagopa-dx/azure-core-values-exporter/azurerm | ~> 0.0 |
| <a name="module_roles_cd"></a> [roles\_cd](#module\_roles\_cd) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.0 |
| <a name="module_roles_ci"></a> [roles\_ci](#module\_roles\_ci) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_role_assignment.contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.storage_blob_contributor](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_role_assignment.user_access_administrator](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [github_actions_secret.appi_instrumentation_key](https://registry.terraform.io/providers/hashicorp/github/latest/docs/resources/actions_secret) | resource |
| [azuread_group.admins](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azuread_group.developers](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azuread_group.externals](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_key_vault_secret.appinsights_instrumentation_key](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |
| [azurerm_resource_group.tfstate](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_core_state"></a> [core\_state](#input\_core\_state) | Details about the Azure Storage Account used to store the Terraform state file. | <pre>object({<br/>    resource_group_name  = string<br/>    storage_account_name = string<br/>    container_name       = string<br/>    key                  = string<br/>  })</pre> | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_repository"></a> [repository](#input\_repository) | Details about the GitHub repository, including owner, name, description, topics, and branch/tag policies. Set the configure option to false only if you already setup the repository for another cloud service provider or environment in the same project. | <pre>object({<br/>    owner                    = optional(string, "pagopa")<br/>    name                     = string<br/>    description              = string<br/>    topics                   = list(string)<br/>    reviewers_teams          = list(string)<br/>    default_branch_name      = optional(string, "main")<br/>    infra_cd_policy_branches = optional(set(string), ["main"])<br/>    opex_cd_policy_branches  = optional(set(string), ["main"])<br/>    app_cd_policy_branches   = optional(set(string), ["main"])<br/>    infra_cd_policy_tags     = optional(set(string), [])<br/>    opex_cd_policy_tags      = optional(set(string), [])<br/>    app_cd_policy_tags       = optional(set(string), [])<br/>    jira_boards_ids          = optional(list(string), [])<br/>    configure                = optional(bool, true)<br/>    pages_enabled            = optional(bool, false)<br/>    has_downloads            = optional(bool, false)<br/>    has_projects             = optional(bool, false)<br/>    homepage_url             = optional(string, null)<br/>    pull_request_bypassers   = optional(list(string), [])<br/>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Map of tags to apply to all created resources. | `map(any)` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
