# DX - Azure Cosmos Account

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-cosmos-account/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-cosmos-account%2Fazurerm%2Flatest)

This Terraform module provisions an Azure Cosmos DB Account with configurable settings, including failover locations, consistency policies, and backup configurations.

## Features

- **Automatic Failover**: Supports automatic failover to ensure high availability.
- **Geo-Replication**: Configurable geo-replication for disaster recovery and performance optimization.
- **Customer-Managed Keys (CMK)**: Uses customer-managed keys (CMK) for encryption if enabled.
- **Zone Redundancy**: Supports zone redundancy for high availability in primary and secondary regions.
- **Backup Policy**: Implements a Continuous 30-day backup policy for data protection.
- **Serverless Mode**: Enables serverless mode for cost-efficient, on-demand scaling.
- **Role Assignment**: Assigns SQL role permissions (Reader or Contributor) to specified principal IDs, enabling fine-grained access control.

## Tiers and Configurations

| Tier  | Description                                                                                        | Serverless Mode |
|-------|----------------------------------------------------------------------------------------------------|-----------------|
| `s`   | Recommended for development or testing environments where cost efficiency and flexibility are key. | Enabled         |
| `l`   | Suitable for production environments requiring predictable performance and provisioned throughput. | Disabled        |

## Usage Example

For usage examples, refer to the [examples folder](https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account/tree/main/examples), which includes:

- A [complete example](https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account/tree/main/examples/complete) demonstrating all features.
- A [minimum example](https://github.com/pagopa-dx/terraform-azurerm-azure-cosmos-account/tree/main/examples/minimum) for basic configurations.

## Diagram
<!-- BEGIN_TF_GRAPH -->
<!-- END_TF_GRAPH -->

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.110, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_cosmosdb_account.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_account) | resource |
| [azurerm_cosmosdb_sql_role_assignment.principal_role_assignments](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_role_assignment) | resource |
| [azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_private_endpoint.sql](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_dns_zone.cosmos](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_alerts"></a> [alerts](#input\_alerts) | Alerts configuration for Cosmos DB account. | <pre>object({<br/>    enabled         = bool<br/>    action_group_id = optional(string, null)<br/>    thresholds = optional(object({<br/>      provisioned_throughput_exceeded = optional(number, null)<br/>    }), {})<br/>  })</pre> | <pre>{<br/>  "enabled": true<br/>}</pre> | no |
| <a name="input_authorized_teams"></a> [authorized\_teams](#input\_authorized\_teams) | Object containing lists of principal IDs (Azure AD object IDs) of product teams to be granted read or write permissions on the Cosmos DB account. These represent the teams within the organization that need access to this resource. | <pre>object({<br/>    writers = optional(list(string), []),<br/>    readers = optional(list(string), [])<br/>  })</pre> | <pre>{<br/>  "readers": [],<br/>  "writers": []<br/>}</pre> | no |
| <a name="input_consistency_policy"></a> [consistency\_policy](#input\_consistency\_policy) | Defines the consistency policy for CosmosDB. Use 'consistency\_preset' for predefined configurations, or set it to 'custom' for manual configuration. Presets include: 'default' (Session consistency), 'high\_consistency' (Strong), 'high\_performance' (Eventual), and 'balanced\_staleness' (BoundedStaleness). For custom configuration, specify 'consistency\_level' and, if using BoundedStaleness, 'max\_interval\_in\_seconds' and 'max\_staleness\_prefix'. Refer to https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels for more details. | <pre>object({<br/>    consistency_preset      = optional(string)<br/>    consistency_level       = optional(string, "Preset")<br/>    max_interval_in_seconds = optional(number, 0)<br/>    max_staleness_prefix    = optional(number, 0)<br/>  })</pre> | n/a | yes |
| <a name="input_customer_managed_key"></a> [customer\_managed\_key](#input\_customer\_managed\_key) | Customer managed key to use for encryption | <pre>object({<br/>    enabled                   = optional(bool, false)<br/>    user_assigned_identity_id = optional(string, null)<br/>    key_vault_key_id          = optional(string, null)<br/>  })</pre> | <pre>{<br/>  "enabled": false<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_force_public_network_access_enabled"></a> [force\_public\_network\_access\_enabled](#input\_force\_public\_network\_access\_enabled) | Specifies whether public network access is allowed for the Cosmos DB account. Defaults to false. | `bool` | `false` | no |
| <a name="input_primary_geo_location"></a> [primary\_geo\_location](#input\_primary\_geo\_location) | The primary geo-location for the Cosmos DB account. Specify 'location' to deploy the account in a region other than the default. | <pre>object({<br/>    location       = optional(string, null)<br/>    zone_redundant = optional(bool, true)<br/>  })</pre> | <pre>{<br/>  "location": null,<br/>  "zone_redundant": true<br/>}</pre> | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | The name of the resource group containing the private DNS zone for private endpoints. Defaults to the Virtual Network resource group. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_secondary_geo_locations"></a> [secondary\_geo\_locations](#input\_secondary\_geo\_locations) | Secondary geo locations for Cosmos DB account. Failover priority determines the order in which regions will take over in case of a regional outage. If failover priority is not set, the items order is used. | <pre>list(object({<br/>    location          = optional(string, null)<br/>    failover_priority = optional(number, null)<br/>    zone_redundant    = optional(bool, true)<br/>  }))</pre> | `[]` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | The ID of the subnet designated for private endpoints. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | The offer type for the Cosmos DB account. Valid values are 's' and 'l'. | `string` | `"l"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_endpoint"></a> [endpoint](#output\_endpoint) | The primary endpoint URL of the Azure Cosmos DB account. |
| <a name="output_id"></a> [id](#output\_id) | The ID of the Azure Cosmos DB account. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Azure Cosmos DB account. |
| <a name="output_read_endpoints"></a> [read\_endpoints](#output\_read\_endpoints) | A list of read endpoints for the Azure Cosmos DB account. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the resource group containing the Azure Cosmos DB account. |
| <a name="output_write_endpoints"></a> [write\_endpoints](#output\_write\_endpoints) | A list of write endpoints for the Azure Cosmos DB account. |
<!-- END_TF_DOCS -->
