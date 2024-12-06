# azure_cosmos_account

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 3.30 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | pagopa/dx-azure-naming-convention/azurerm | ~> 0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_cosmosdb_account.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_account) | resource |
| [azurerm_monitor_metric_alert.cosmos_db_provisioned_throughput_exceeded](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_private_endpoint.sql](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_dns_zone.cosmos](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_alerts"></a> [alerts](#input\_alerts) | (Optional) Alerts configuration for Cosmos DB account. | <pre>object({<br/>    enabled         = bool<br/>    action_group_id = optional(string, null)<br/>    thresholds = optional(object({<br/>      provisioned_throughput_exceeded = optional(number, null)<br/>    }), {})<br/>  })</pre> | <pre>{<br/>  "enabled": true<br/>}</pre> | no |
| <a name="input_consistency_policy"></a> [consistency\_policy](#input\_consistency\_policy) | Defines the consistency policy for CosmosDB. Use 'consistency\_preset' for predefined configurations, or set it to 'custom' for manual configuration. Presets include: 'default' (Session consistency), 'high\_consistency' (Strong), 'high\_performance' (Eventual), and 'balanced\_staleness' (BoundedStaleness). For custom configuration, specify 'consistency\_level' and, if using BoundedStaleness, 'max\_interval\_in\_seconds' and 'max\_staleness\_prefix'. Refer to https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels for more details. | <pre>object({<br/>    consistency_preset      = optional(string)<br/>    consistency_level       = optional(string, "Preset")<br/>    max_interval_in_seconds = optional(number, 0)<br/>    max_staleness_prefix    = optional(number, 0)<br/>  })</pre> | n/a | yes |
| <a name="input_customer_managed_key"></a> [customer\_managed\_key](#input\_customer\_managed\_key) | (Optional) Customer managed key to use for encryption | <pre>object({<br/>    enabled                   = optional(bool, false)<br/>    user_assigned_identity_id = optional(string, null)<br/>    key_vault_key_id          = optional(string, null)<br/>  })</pre> | <pre>{<br/>  "enabled": false<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_force_public_network_access_enabled"></a> [force\_public\_network\_access\_enabled](#input\_force\_public\_network\_access\_enabled) | (Optional) Whether the Storage Account permits public network access or not. Defaults to false. | `bool` | `false` | no |
| <a name="input_primary_geo_location"></a> [primary\_geo\_location](#input\_primary\_geo\_location) | Primary geo location for Cosmos DB account. Set location if you want to deploy the cosmos account in a different region than the default. | <pre>object({<br/>    location       = optional(string, null)<br/>    zone_redundant = optional(bool, true)<br/>  })</pre> | <pre>{<br/>  "location": null,<br/>  "zone_redundant": true<br/>}</pre> | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | (Optional) The name of the resource group holding private DNS zone to use for private endpoints. Default is Virtual Network resource group | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_secondary_geo_locations"></a> [secondary\_geo\_locations](#input\_secondary\_geo\_locations) | (Optional) Secondary geo locations for Cosmos DB account. Failover priority determines the order in which regions will take over in case of a regional outage. If failover priority is not set, the items order is used. | <pre>list(object({<br/>    location          = optional(string, null)<br/>    failover_priority = optional(number, null)<br/>    zone_redundant    = optional(bool, true)<br/>  }))</pre> | `[]` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | Id of the subnet which holds private endpoints | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_endpoint"></a> [endpoint](#output\_endpoint) | n/a |
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_read_endpoints"></a> [read\_endpoints](#output\_read\_endpoints) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
| <a name="output_write_endpoints"></a> [write\_endpoints](#output\_write\_endpoints) | n/a |
<!-- END_TF_DOCS -->
