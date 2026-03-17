# metrics_portal

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.11.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.23 |
| <a name="requirement_random"></a> [random](#requirement\_random) | >= 3.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_container_app"></a> [container\_app](#module\_container\_app) | pagopa-dx/azure-container-app/azurerm | ~> 1.0 |
| <a name="module_container_app_key_vault_roles"></a> [container\_app\_key\_vault\_roles](#module\_container\_app\_key\_vault\_roles) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.0 |
| <a name="module_postgres"></a> [postgres](#module\_postgres) | pagopa-dx/azure-postgres-server/azurerm | ~> 3.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_key_vault_secret.auth_github_id](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_key_vault_secret.auth_github_secret](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_key_vault_secret.better_auth_secret](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_key_vault_secret.database_url](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_key_vault_secret.github_runner_pat](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_container_app_env_id"></a> [container\_app\_env\_id](#input\_container\_app\_env\_id) | ID of the Container App Environment. | `string` | n/a | yes |
| <a name="input_container_app_image"></a> [container\_app\_image](#input\_container\_app\_image) | OCI image URI for the Container App. Should reference the dx-metrics image from GitHub Container Registry (e.g., 'ghcr.io/pagopa/dx/dx-metrics:latest'). Built and deployed via GitHub Actions. | `string` | n/a | yes |
| <a name="input_container_app_user_assigned_identity_id"></a> [container\_app\_user\_assigned\_identity\_id](#input\_container\_app\_user\_assigned\_identity\_id) | ID of the user-assigned managed identity for the Container App to access Key Vault. | `string` | n/a | yes |
| <a name="input_container_app_user_assigned_identity_principal_id"></a> [container\_app\_user\_assigned\_identity\_principal\_id](#input\_container\_app\_user\_assigned\_identity\_principal\_id) | Principal ID of the user-assigned managed identity for the Container App to access Key Vault. | `string` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values used to generate resource names and location short names. | <pre>object({<br/>    prefix          = string<br/>    environment     = optional(string)<br/>    env_short       = optional(string)<br/>    location        = string<br/>    instance_number = string<br/>    domain          = optional(string)<br/>    app_name        = optional(string)<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault_id"></a> [key\_vault\_id](#input\_key\_vault\_id) | ID of the Key Vault where secrets (DB credentials, connection string) will be stored. | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Name of the resource group containing private DNS zones (e.g. the network resource group). | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | ID of the subnet used for private endpoints. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Map of tags to assign to all resources. | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_container_app"></a> [container\_app](#output\_container\_app) | Details of the Container App hosting the Next.js application. |
| <a name="output_postgres"></a> [postgres](#output\_postgres) | Details of the PostgreSQL Flexible Server (name, ID, resource group). |
<!-- END_TF_DOCS -->
