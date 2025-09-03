# DX - Azure Core Values Exporter

This Terraform module enables the standardized export and sharing of core Azure infrastructure values across projects and environments.  
It is designed to harmonize the configuration of cloud resources by exposing key outputs such as resource group names, network details, and shared service endpoints from the main `azure-core-infra` state, making them easily consumable by dependent modules and project-specific stacks.

## Supported Backends

This module supports both **Azure Storage** and **S3** (AWS) backends for Terraform remote state:

- **Azure Storage Backend**: Traditional Azure Storage Account containers for state storage
- **S3 Backend**: Cross-cloud support for organizations using AWS S3 for state storage

**Auto-Detection**: The backend type is automatically detected based on which fields are populated in the `core_state` variable.

## Usage Examples

### Azure Storage Account (Default)

```hcl
module "azure_core_values_exporter" {
  source = "path/to/module"

  core_state = {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stterraformstate"
    container_name       = "tfstate"
    key                  = "azure/core/terraform.tfstate"
  }
}
```

### AWS S3 Backend

```hcl
module "azure_core_values_exporter" {
  source = "path/to/module"

  core_state = {
    bucket         = "my-terraform-state-bucket"
    key            = "azure/core/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"  # optional
  }
}
```

<!-- BEGIN_TF_DOCS -->

## Requirements

| Name                                                               | Version           |
| ------------------------------------------------------------------ | ----------------- |
| <a name="requirement_azurerm"></a> [azurerm](#requirement_azurerm) | >= 3.0.0, < 5.0   |
| <a name="requirement_dx"></a> [dx](#requirement_dx)                | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name                                                                                                                                     | Type        |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [terraform_remote_state.core_azurerm](https://registry.terraform.io/providers/hashicorp/terraform/latest/docs/data-sources/remote_state) | data source |
| [terraform_remote_state.core_s3](https://registry.terraform.io/providers/hashicorp/terraform/latest/docs/data-sources/remote_state)      | data source |

## Inputs

| Name                                                            | Description                                                                                              | Type                                                                                                                                                                                                                                                                                                                                                                                                              | Default | Required |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | :------: |
| <a name="input_core_state"></a> [core_state](#input_core_state) | Configuration for accessing the core Terraform state. Supports both S3 (AWS) and Azure Storage backends. | <pre>object({<br/> key = string<br/><br/> # Azure Storage backend configuration<br/> storage_account_name = optional(string, null)<br/> container_name = optional(string, null)<br/> resource_group_name = optional(string, null)<br/><br/> # S3 backend configuration (AWS)<br/> bucket = optional(string, null)<br/> region = optional(string, null)<br/> dynamodb_table = optional(string, null)<br/> })</pre> | n/a     |   yes    |

## Outputs

| Name                                                                                                                          | Description                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| <a name="output_application_insights"></a> [application_insights](#output_application_insights)                               | Details of the Application Insights instance, including its ID, name, and instrumentation key. |
| <a name="output_common_key_vault"></a> [common_key_vault](#output_common_key_vault)                                           | Details of the common Key Vault, including its name, ID, and resource group name.              |
| <a name="output_common_log_analytics_workspace"></a> [common_log_analytics_workspace](#output_common_log_analytics_workspace) | Details of the common Log Analytics Workspace, including its ID, name, and workspace ID.       |
| <a name="output_common_nat_gateways"></a> [common_nat_gateways](#output_common_nat_gateways)                                  | A list of NAT gateways, including their IDs and names.                                         |
| <a name="output_common_pep_snet"></a> [common_pep_snet](#output_common_pep_snet)                                              | Details of the private endpoint subnet, including its name and ID.                             |
| <a name="output_common_resource_group_id"></a> [common_resource_group_id](#output_common_resource_group_id)                   | The ID of the common resource group.                                                           |
| <a name="output_common_resource_group_name"></a> [common_resource_group_name](#output_common_resource_group_name)             | The name of the common resource group.                                                         |
| <a name="output_common_test_snet"></a> [common_test_snet](#output_common_test_snet)                                           | Details of the test subnet, including its name and ID.                                         |
| <a name="output_common_vnet"></a> [common_vnet](#output_common_vnet)                                                          | Details of the common virtual network, including its name and ID.                              |
| <a name="output_github_runner"></a> [github_runner](#output_github_runner)                                                    | Details of the GitHub runner, including environment ID, resource group name, and subnet ID.    |
| <a name="output_network_resource_group_id"></a> [network_resource_group_id](#output_network_resource_group_id)                | The ID of the network resource group.                                                          |
| <a name="output_network_resource_group_name"></a> [network_resource_group_name](#output_network_resource_group_name)          | The name of the network resource group.                                                        |
| <a name="output_opex_resource_group_id"></a> [opex_resource_group_id](#output_opex_resource_group_id)                         | The ID of the OPEX resource group.                                                             |
| <a name="output_opex_resource_group_name"></a> [opex_resource_group_name](#output_opex_resource_group_name)                   | The name of the OPEX resource group.                                                           |
| <a name="output_test_resource_group_id"></a> [test_resource_group_id](#output_test_resource_group_id)                         | The ID of the test resource group (null if testing is disabled).                               |
| <a name="output_test_resource_group_name"></a> [test_resource_group_name](#output_test_resource_group_name)                   | The name of the test resource group (null if testing is disabled).                             |

<!-- END_TF_DOCS -->
