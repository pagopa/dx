# DX - Azure Event Hub

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-event-hub/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-event-hub%2Fazurerm%2Flatest)

This Terraform module provisions an Azure Event Hub namespace, event hubs, consumer groups, authorization rules, private endpoints, and monitoring configurations.

## Features

- **Event Hub Namespace**: Creates the Event Hub namespace, which acts as a container for Event Hubs.
- **Event Hubs**: Create multiple Event Hubs with customizable partitions and retention policies.
- **Consumer Groups**: Define as many consumer groups as needed for each Event Hub.
- **Authorization Rules**: Configure granular access policies for Event Hubs with support for listen, send, and manage permissions.
- **Private Endpoint**: Creates a private endpoint for secure access to the Event Hub namespace.
- **Monitoring**: Configures metric alerts for monitoring Event Hub health.

## Tiers and Configurations

| Tier | Description                                                                   | Capacity | Auto Inflate | Maximum Throughput Units |
|------|-------------------------------------------------------------------------------|----------|--------------|--------------------------|
| `s`  | Designed for test and development environments with limited requirements.     | N/A      | No           | N/A                      |
| `m`  | Suitable for production environments with low to moderate demands.            | 1        | No           | N/A                      |
| `l`  | Ideal for high-demand production environments with auto-scaling capabilities. | 2        | Yes          | 15                       |

### Usage Example

For a complete example of how to use this module, refer to the [example/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-event-hub/tree/main/example/complete) folder in the module repository.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.37.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_eventhub.events](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub) | resource |
| [azurerm_eventhub_authorization_rule.authorization_rule](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub_authorization_rule) | resource |
| [azurerm_eventhub_consumer_group.consumer_group](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub_consumer_group) | resource |
| [azurerm_eventhub_namespace.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/eventhub_namespace) | resource |
| [azurerm_monitor_metric_alert.event_hub_health_check](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_private_endpoint.event_hub_pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_dns_zone.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | The ID of the Action Group to invoke when an alert is triggered for the Event Hub. | `string` | `null` | no |
| <a name="input_allowed_sources"></a> [allowed\_sources](#input\_allowed\_sources) | Lists of allowed sources for accessing the Event Hub, including subnet IDs and IP address ranges. | <pre>object({<br/>    subnet_ids = optional(list(string), [])<br/>    ips        = optional(list(string), [])<br/>  })</pre> | `{}` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_eventhubs"></a> [eventhubs](#input\_eventhubs) | A list of event hubs to add to namespace. | <pre>list(object({<br/>    name                   = string       # (Required) Specifies the name of the EventHub resource. Changing this forces a new resource to be created.<br/>    partitions             = number       # (Required) Specifies the current number of shards on the Event Hub.<br/>    message_retention_days = number       # (Required) Specifies the number of days to retain the events for this Event Hub.<br/>    consumers              = list(string) # Manages a Event Hubs Consumer Group as a nested resource within an Event Hub.<br/>    keys = list(object({<br/>      name   = string # (Required) Specifies the name of the EventHub Authorization Rule resource. Changing this forces a new resource to be created.<br/>      listen = bool   # (Optional) Does this Authorization Rule have permissions to Listen to the Event Hub? Defaults to false.<br/>      send   = bool   # (Optional) Does this Authorization Rule have permissions to Send to the Event Hub? Defaults to false.<br/>      manage = bool   # (Optional) Does this Authorization Rule have permissions to Manage to the Event Hub? When this property is true - both listen and send must be too. Defaults to false.<br/>    }))               # Manages a Event Hubs authorization Rule within an Event Hub.<br/>  }))</pre> | `[]` | no |
| <a name="input_metric_alerts"></a> [metric\_alerts](#input\_metric\_alerts) | Map of name = criteria objects | <pre>map(object({<br/>    aggregation = string # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]<br/>    metric_name = string # https://learn.microsoft.com/en-us/azure/event-hubs/monitor-event-hubs-reference<br/>    description = string<br/>    operator    = string # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]<br/>    threshold   = number<br/>    frequency   = string # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H<br/>    window_size = string # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.<br/>  }))</pre> | `{}` | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | The name of the resource group containing the private DNS zone for private endpoints. Defaults to the Virtual Network resource group. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | The ID of the subnet designated for private endpoints. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on demanding workload. Allowed values are 's', 'm', 'l'. | `string` | `"s"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_hub_ids"></a> [hub\_ids](#output\_hub\_ids) | A map containing the names of Event Hubs as keys and their corresponding IDs as values. |
| <a name="output_key_ids"></a> [key\_ids](#output\_key\_ids) | A list of IDs for the keys associated with the Event Hub. |
| <a name="output_name"></a> [name](#output\_name) | The name of the Event Hub Namespace. |
| <a name="output_namespace_id"></a> [namespace\_id](#output\_namespace\_id) | The ID of the Event Hub Namespace. |
| <a name="output_private_dns_zone"></a> [private\_dns\_zone](#output\_private\_dns\_zone) | Details of the private DNS zone used to resolve the name of the Private Endpoint for connecting to the Event Hub. Includes the DNS zone ID and name. |
<!-- END_TF_DOCS -->
