# dev

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | <= 3.117.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 3.117.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_container_app_job_selfhosted_runner"></a> [container\_app\_job\_selfhosted\_runner](#module\_container\_app\_job\_selfhosted\_runner) | ../../modules/github_selfhosted_runner_on_container_app_jobs | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_container_app_environment.gh_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/container_app_environment) | data source |
| [azurerm_key_vault.key_vault](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |
| [azurerm_resource_group.gh_runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |

## Inputs

No inputs.

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_container_app_job"></a> [container\_app\_job](#output\_container\_app\_job) | n/a |
<!-- END_TF_DOCS -->
