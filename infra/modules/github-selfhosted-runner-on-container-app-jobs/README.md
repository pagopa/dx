# DX Typescript - GitHub SelfHosted Runner on Azure Container App Job

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~>3.86 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_container_app_job_selfhosted_runner"></a> [container\_app\_job\_selfhosted\_runner](#module\_container\_app\_job\_selfhosted\_runner) | github.com/pagopa/terraform-azurerm-v3//container_app_job_gh_runner | v8.20.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app_environment.runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/container_app_environment) | data source |
| [azurerm_key_vault.kv](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_container_app_environment"></a> [container\_app\_environment](#input\_container\_app\_environment) | Name and resource group of the Container App Environment to use as host | <pre>object({<br>    name                = string<br>    resource_group_name = string<br>  })</pre> | n/a | yes |
| <a name="input_container_app_job_name"></a> [container\_app\_job\_name](#input\_container\_app\_job\_name) | (Optional) Override Container App Job name auto generated | `string` | `""` | no |
| <a name="input_env_short"></a> [env\_short](#input\_env\_short) | Environment short name | `string` | n/a | yes |
| <a name="input_key_vault"></a> [key\_vault](#input\_key\_vault) | Name and resource group of the KeyVault holding secrets for this job | <pre>object({<br>    name                = string<br>    resource_group_name = string<br>  })</pre> | n/a | yes |
| <a name="input_key_vault_secret_name"></a> [key\_vault\_secret\_name](#input\_key\_vault\_secret\_name) | Name of the KeyVault secret containing the GITHUB\_PAT value | `string` | `"github-runner-pat"` | no |
| <a name="input_prefix"></a> [prefix](#input\_prefix) | Project prefix | `string` | n/a | yes |
| <a name="input_repo_name"></a> [repo\_name](#input\_repo\_name) | This repository name | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_container_app_job"></a> [container\_app\_job](#output\_container\_app\_job) | n/a |
<!-- END_TF_DOCS -->
