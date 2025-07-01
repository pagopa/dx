# bootstrapper

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azuread"></a> [azuread](#provider\_azuread) | n/a |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | n/a |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_bootstrap"></a> [bootstrap](#module\_bootstrap) | pagopa-dx/azure-github-environment-bootstrap/azurerm | ~> 2.0 |
| <a name="module_core_values"></a> [core\_values](#module\_core\_values) | github.com/pagopa/dx.git//infra/modules/azure_core_values_exporter | implement-common-values-for-core-infra |

## Resources

| Name | Type |
|------|------|
| [azuread_group.admins](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azuread_group.developers](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azuread_group.externals](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/group) | data source |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_repository"></a> [repository](#input\_repository) | Details about the GitHub repository, including owner, name, description, topics, and branch/tag policies. Set the configure option to false only if you already setup the repository for another cloud service provider or environment in the same project. | <pre>object({<br/>    owner                    = optional(string, "pagopa")<br/>    name                     = string<br/>    description              = string<br/>    topics                   = list(string)<br/>    reviewers_teams          = list(string)<br/>    default_branch_name      = optional(string, "main")<br/>    infra_cd_policy_branches = optional(set(string), ["main"])<br/>    opex_cd_policy_branches  = optional(set(string), ["main"])<br/>    app_cd_policy_branches   = optional(set(string), ["main"])<br/>    infra_cd_policy_tags     = optional(set(string), [])<br/>    opex_cd_policy_tags      = optional(set(string), [])<br/>    app_cd_policy_tags       = optional(set(string), [])<br/>    jira_boards_ids          = optional(list(string), [])<br/>    configure                = optional(bool, true)<br/>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Map of tags to apply to all created resources. | `map(any)` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
