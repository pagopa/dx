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
| <a name="module_container_app"></a> [container\_app](#module\_container\_app) | github.com/pagopa/dx//infra/modules/azure_container_app | allow-container-app-environment-to-have-public-connectivity |
| <a name="module_container_app_key_vault_roles"></a> [container\_app\_key\_vault\_roles](#module\_container\_app\_key\_vault\_roles) | pagopa-dx/azure-role-assignments/azurerm | ~> 1.0 |
| <a name="module_postgres"></a> [postgres](#module\_postgres) | pagopa-dx/azure-postgres-server/azurerm | ~> 3.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_key_vault_secret.azuread_client_secret](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |
| [azurerm_key_vault_secret.database_url](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_auth_entra_id_client_id"></a> [auth\_entra\_id\_client\_id](#input\_auth\_entra\_id\_client\_id) | Azure Entra ID application (client) ID for authentication. When set, enables managed authentication on the Container App. Not sensitive — it is a public application identifier. | `string` | `"90565e12-fde8-4a60-95ee-a282409d3b86"` | no |
| <a name="input_container_app_env_id"></a> [container\_app\_env\_id](#input\_container\_app\_env\_id) | ID of the Container App Environment. | `string` | n/a | yes |
| <a name="input_container_app_image"></a> [container\_app\_image](#input\_container\_app\_image) | OCI image URI for the Container App. Should reference the dx-metrics image from GitHub Container Registry (e.g., 'ghcr.io/pagopa/dx/dx-metrics:latest'). Built and deployed via GitHub Actions. | `string` | n/a | yes |
| <a name="input_container_app_user_assigned_identity_id"></a> [container\_app\_user\_assigned\_identity\_id](#input\_container\_app\_user\_assigned\_identity\_id) | ID of the user-assigned managed identity for the Container App to access Key Vault. | `string` | n/a | yes |
| <a name="input_container_app_user_assigned_identity_principal_id"></a> [container\_app\_user\_assigned\_identity\_principal\_id](#input\_container\_app\_user\_assigned\_identity\_principal\_id) | Principal ID of the user-assigned managed identity for the Container App to access Key Vault. | `string` | n/a | yes |
| <a name="input_custom_domain_host_name"></a> [custom\_domain\_host\_name](#input\_custom\_domain\_host\_name) | Host name for the custom domain to be used by the Container App (e.g., 'metrics.dx.pagopa.it'). The domain must be configured in the specified DNS zone. | `string` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values used to generate resource names and location short names. | <pre>object({<br/>    prefix          = string<br/>    environment     = string<br/>    location        = string<br/>    instance_number = string<br/>    domain          = optional(string)<br/>    app_name        = optional(string)<br/>  })</pre> | n/a | yes |
| <a name="input_key_vault_id"></a> [key\_vault\_id](#input\_key\_vault\_id) | ID of the Key Vault where secrets (DB credentials, connection string) will be stored. | `string` | n/a | yes |
| <a name="input_network_resource_group_name"></a> [network\_resource\_group\_name](#input\_network\_resource\_group\_name) | Name of the resource group containing network resources, used for DNS zone reference. | `string` | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Name of the resource group containing private DNS zones (e.g. the network resource group). | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | ID of the subnet used for private endpoints. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Map of tags to assign to all resources. | `map(any)` | n/a | yes |
| <a name="input_tenant_id"></a> [tenant\_id](#input\_tenant\_id) | Azure tenant ID for authentication. | `string` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_container_app"></a> [container\_app](#output\_container\_app) | Details of the Container App hosting the Next.js application. |
| <a name="output_postgres"></a> [postgres](#output\_postgres) | Details of the PostgreSQL Flexible Server (name, ID, resource group). |
<!-- END_TF_DOCS -->
