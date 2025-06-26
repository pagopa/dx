# azure_core_values_exporter

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.0.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [terraform_remote_state.core](https://registry.terraform.io/providers/hashicorp/terraform/latest/docs/data-sources/remote_state) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_core_state"></a> [core\_state](#input\_core\_state) | Configuration for accessing the core Terraform state where azure-core-infra module is deployed. | <pre>object({<br/>    resource_group_name  = string<br/>    storage_account_name = string<br/>    container_name       = string<br/>    key                  = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_common_key_vault"></a> [common\_key\_vault](#output\_common\_key\_vault) | Details of the common Key Vault, including its name, ID, and resource group name. |
| <a name="output_common_log_analytics_workspace"></a> [common\_log\_analytics\_workspace](#output\_common\_log\_analytics\_workspace) | Details of the common Log Analytics Workspace, including its ID, name, and workspace ID. |
| <a name="output_common_nat_gateways"></a> [common\_nat\_gateways](#output\_common\_nat\_gateways) | A list of NAT gateways, including their IDs and names. |
| <a name="output_common_pep_snet"></a> [common\_pep\_snet](#output\_common\_pep\_snet) | Details of the private endpoint subnet, including its name and ID. |
| <a name="output_common_resource_group_id"></a> [common\_resource\_group\_id](#output\_common\_resource\_group\_id) | The ID of the common resource group. |
| <a name="output_common_resource_group_name"></a> [common\_resource\_group\_name](#output\_common\_resource\_group\_name) | The name of the common resource group. |
| <a name="output_common_vnet"></a> [common\_vnet](#output\_common\_vnet) | Details of the common virtual network, including its name and ID. |
| <a name="output_github_runner"></a> [github\_runner](#output\_github\_runner) | Details of the GitHub runner, including environment ID, resource group name, and subnet ID. |
| <a name="output_network_resource_group_id"></a> [network\_resource\_group\_id](#output\_network\_resource\_group\_id) | The ID of the network resource group. |
| <a name="output_network_resource_group_name"></a> [network\_resource\_group\_name](#output\_network\_resource\_group\_name) | The name of the network resource group. |
| <a name="output_test_resource_group_id"></a> [test\_resource\_group\_id](#output\_test\_resource\_group\_id) | The ID of the test resource group (null if testing is disabled). |
| <a name="output_test_resource_group_name"></a> [test\_resource\_group\_name](#output\_test\_resource\_group\_name) | The name of the test resource group (null if testing is disabled). |
<!-- END_TF_DOCS -->
