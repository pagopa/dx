# DX - Azure Service Bus Alerts

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-service-bus-dlq-alert/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-service-bus-dlq-alert%2Fazurerm%2Flatest)

This Terraform module provisions alerts to monitor the amount of messages in both active and DLQ Service Bus entities (queue and topics).

## Features

- **Ready-to-use**: A ready-to-use configuration to have alerts over Service Bus entities (queues and topics).
- **Support multiple entities**: Multiple Service Bus entities could be set in a single alert as a simple string collection.

## Usage Example

An example of how to use this module can be found in the [example/simple](https://github.com/pagopa-dx/terraform-azurerm-azure-service-bus-dlq-alert/tree/main/example/simple) directory.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.3.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_metric_alert.active](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.dlq](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_ids"></a> [action\_group\_ids](#input\_action\_group\_ids) | Id list of the action groups to notify when the alert is triggered | `list(string)` | n/a | yes |
| <a name="input_alerts_on_active_messages"></a> [alerts\_on\_active\_messages](#input\_alerts\_on\_active\_messages) | "Configure alert over the number of messages in active state. If set to null, no alert will be created<br/>- "description": used to describe the alert in Azure Monitor<br/>- "entity\_names": list of Service Bus Entities (Queues or Topics) to monitor for dead-lettered messages. Each entity should be specified as a string<br/>- "threshold": the average number of messages that triggers the alert. It is compared using GreaterThan operator. Default value is 10.<br/>- "severity": valid values are "Critical", "Error", "Warning", "Informational" or "Verbose" (case-sensitive). Default is "Warning"<br/>- "auto\_mitigate": indicates whether the alert should automatically resolve when the condition is no longer met. Default is true"<br/>- "check\_every": frequency at which the alert rule is evaluted. Default is PT15M (15 minutes). Valid values are ISO 8601 durations"<br/>- "lookback\_period": the time window over which the alert rule is evaluated. Default is PT30M (30 minutes). Valid values are ISO 8601 durations"<br/>- "enable": indicates whether alerts are enabled or not. Default is true | <pre>object({<br/>    description     = string<br/>    entity_names    = list(string)<br/>    threshold       = optional(number, 10)<br/>    severity        = optional(string, "Warning")<br/>    auto_mitigate   = optional(bool, true)<br/>    check_every     = optional(string, "PT15M")<br/>    lookback_period = optional(string, "PT30M")<br/>    enable          = optional(bool, true)<br/>  })</pre> | `null` | no |
| <a name="input_alerts_on_dlq_messages"></a> [alerts\_on\_dlq\_messages](#input\_alerts\_on\_dlq\_messages) | "Configure alert over messages moved in dead-letter queue. If set to null, no alert will be created.<br/>- "description": used to describe the alert in Azure Monitor<br/>- "entity\_names": list of Service Bus Entities (Queues or Topics) to monitor for dead-lettered messages. Each entity should be specified as a string<br/>- "threshold": the average number of messages that triggers the alert. It is compared using GreaterThan operator. Default value is 0<br/>- "severity": valid values are "Critical", "Error", "Warning", "Informational" or "Verbose" (case-sensitive). Default is "Error"<br/>- "auto\_mitigate": indicates whether the alert should automatically resolve when the condition is no longer met. Default is true"<br/>- "check\_every": frequency at which the alert rule is evaluted. Default is PT1M (1 minute). Valid values are ISO 8601 durations"<br/>- "lookback\_period": the time window over which the alert rule is evaluated. Default is PT5M (5 minutes). Valid values are ISO 8601 durations"<br/>- "enable": indicates whether alerts are enabled or not. Default is true | <pre>object({<br/>    description     = string<br/>    entity_names    = list(string)<br/>    threshold       = optional(number, 0)<br/>    severity        = optional(string, "Error")<br/>    auto_mitigate   = optional(bool, true)<br/>    check_every     = optional(string, "PT1M")<br/>    lookback_period = optional(string, "PT5M")<br/>  })</pre> | `null` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_service_bus_namespace_id"></a> [service\_bus\_namespace\_id](#input\_service\_bus\_namespace\_id) | Id of the Service Bus Namespace to monitor for dead-lettered messages | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_active"></a> [active](#output\_active) | Id of the Metric Alert monitoring active message queue size |
| <a name="output_dlq"></a> [dlq](#output\_dlq) | Id of the Metric Alert monitoring DLQ message queue size |
<!-- END_TF_DOCS -->
