# test_infrastructure

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.46.0 |
| <a name="provider_dx"></a> [dx](#provider\_dx) | n/a |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_gh_runner_integration_tests"></a> [gh\_runner\_integration\_tests](#module\_gh\_runner\_integration\_tests) | pagopa-dx/github-selfhosted-runner-on-container-app-jobs/azurerm | ~> 1.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app_environment.tests](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app_environment) | resource |
| [azurerm_log_analytics_workspace.tests](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace) | resource |
| [azurerm_resource_group.tests](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_subnet.cae_snets](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_subnet.pep_snets](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_virtual_network.tests](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network) | resource |
| [dx_available_subnet_cidr.cae_snet_cidrs](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [dx_available_subnet_cidr.pep_snet_cidrs](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | n/a | <pre>object({<br/>    prefix          = string<br/>    environment     = string<br/>    location        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_gh_pat_reference"></a> [gh\_pat\_reference](#input\_gh\_pat\_reference) | n/a | <pre>object({<br/>    keyvault_name                = string<br/>    keyvault_resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Tags to apply to resources | `map(string)` | n/a | yes |
| <a name="input_tests_kind"></a> [tests\_kind](#input\_tests\_kind) | List of test kinds to create resources for. Allowed values are 'integration' and 'e2e'. | `set(string)` | n/a | yes |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
