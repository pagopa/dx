# DX - Azure Service Bus DLQ Alert

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-service-bus-dlq-alert/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-service-bus-dlq-alert%2Fazurerm%2Flatest)

This Terraform module provisions an alert to monitor messages in the Service Bus DLQs.

## Features

- **Ready-to-use**: A ready-to-use configuration to have alerts over Service Bus queues and topics.
- **Support multiple entities**: Multiple Service Bus entities could be set in a single alert as a simple string collection.

## Usage Example

An example of how to use this module can be found in the [example/simple](https://github.com/pagopa-dx/terraform-azurerm-azure-service-bus-dlq-alert/tree/main/example/simple) directory.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_metric_alert.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_ids"></a> [action\_group\_ids](#input\_action\_group\_ids) | Id list of the action groups to notify when the alert is triggered | `list(string)` | n/a | yes |
| <a name="input_auto_mitigate"></a> [auto\_mitigate](#input\_auto\_mitigate) | Indicates whether the alert should automatically resolve when the condition is no longer met. Default is true. | `bool` | `true` | no |
| <a name="input_description"></a> [description](#input\_description) | Description of the alert | `string` | n/a | yes |
| <a name="input_enable"></a> [enable](#input\_enable) | Indicates whether the alert is enabled. Default is true | `bool` | `true` | no |
| <a name="input_entity_names"></a> [entity\_names](#input\_entity\_names) | List of Service Bus Entities (Queues or Topics) to monitor for dead-lettered messages. Each entity should be specified as a string. | `list(string)` | n/a | yes |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_frequency"></a> [frequency](#input\_frequency) | The frequency at which the alert rule is evaluted. Default is PT1M (1 minute). Valid values are ISO 8601 durations | `string` | `"PT1M"` | no |
| <a name="input_service_bus_namespace_id"></a> [service\_bus\_namespace\_id](#input\_service\_bus\_namespace\_id) | Id of the Service Bus Namespace to monitor for dead-lettered messages | `string` | n/a | yes |
| <a name="input_severity"></a> [severity](#input\_severity) | The severity of the alert. Default is Error. Valid values are Critical, Error, Warning, Informational, and Verbose. | `string` | `"Error"` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_threshold"></a> [threshold](#input\_threshold) | Threshold for the number of dead-lettered messages that triggers the alert. Default is 0. | `number` | `0` | no |
| <a name="input_window_size"></a> [window\_size](#input\_window\_size) | The time window over which the alert rule is evaluated. Default is PT5M (5 minutes). Valid values are ISO 8601 durations | `string` | `"PT5M"` | no |

## Outputs

No outputs.
<!-- END_TF_DOCS -->
