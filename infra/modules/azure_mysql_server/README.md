# DX - Azure MySQL Flex Server

<!-- markdownlint-disable -->
<!-- BEGINNING OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | ~> 1.7.5 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.116.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.2.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | ../azure_naming_convention | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_monitor_diagnostic_setting.replica](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_monitor_diagnostic_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_monitor_metric_alert.replica](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_mysql_flexible_server.replica](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mysql_flexible_server) | resource |
| [azurerm_mysql_flexible_server.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mysql_flexible_server) | resource |
| [azurerm_private_endpoint.mysql_pe](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.replica_mysql_pe](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_dns_zone.mysql_dns_zone](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_administrator_credentials"></a> [administrator\_credentials](#input\_administrator\_credentials) | Flexible MySQL server administrator credentials (Only for tests) | <pre>object({<br>    name     = string<br>    password = string<br>  })</pre> | n/a | yes |
| <a name="input_alert_action"></a> [alert\_action](#input\_alert\_action) | The ID of the Action Group and optional map of custom string properties to include with the post webhook operation. | <pre>set(object(<br>    {<br>      action_group_id    = string<br>      webhook_properties = map(string)<br>    }<br>  ))</pre> | `[]` | no |
| <a name="input_alerts_enabled"></a> [alerts\_enabled](#input\_alerts\_enabled) | Define if alerts should be enabled. | `bool` | `false` | no |
| <a name="input_backup_retention_days"></a> [backup\_retention\_days](#input\_backup\_retention\_days) | (Optional) The backup retention days for the MySQL Flexible Server. Possible values are between 7 and 35 days. | `number` | `7` | no |
| <a name="input_custom_metric_alerts"></a> [custom\_metric\_alerts](#input\_custom\_metric\_alerts) | Map of name = criteria objects | <pre>map(object({<br>    # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]<br>    aggregation = string<br>    metric_name = string<br>    # "Insights.Container/pods" "Insights.Container/nodes"<br>    metric_namespace = string<br>    # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]<br>    operator  = string<br>    threshold = number<br>    # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H<br>    frequency = string<br>    # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.<br>    window_size = string<br>    # severity: The severity of this Metric Alert. Possible values are 0, 1, 2, 3 and 4. Defaults to 3.<br>    severity = number<br>  }))</pre> | `null` | no |
| <a name="input_db_version"></a> [db\_version](#input\_db\_version) | The version of MySQL Flexible Server to use. Possible values are 5.7, and 8.0.21 | `string` | `"8.0.21"` | no |
| <a name="input_default_metric_alerts"></a> [default\_metric\_alerts](#input\_default\_metric\_alerts) | Map of name = criteria objects | <pre>map(object({<br>    # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]<br>    aggregation = string<br>    metric_name = string<br>    # "Insights.Container/pods" "Insights.Container/nodes"<br>    metric_namespace = string<br>    # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]<br>    operator  = string<br>    threshold = number<br>    # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H<br>    frequency = string<br>    # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.<br>    window_size = string<br>    # severity: The severity of this Metric Alert. Possible values are 0, 1, 2, 3 and 4. Defaults to 3.<br>    severity = number<br>  }))</pre> | <pre>{<br>  "active_connections": {<br>    "aggregation": "Average",<br>    "frequency": "PT5M",<br>    "metric_name": "active_connections",<br>    "metric_namespace": "Microsoft.DBforMySQL/flexibleServers",<br>    "operator": "GreaterThan",<br>    "severity": 2,<br>    "threshold": 80,<br>    "window_size": "PT30M"<br>  },<br>  "connections_failed": {<br>    "aggregation": "Total",<br>    "frequency": "PT5M",<br>    "metric_name": "connections_failed",<br>    "metric_namespace": "Microsoft.DBforMySQL/flexibleServers",<br>    "operator": "GreaterThan",<br>    "severity": 2,<br>    "threshold": 80,<br>    "window_size": "PT30M"<br>  },<br>  "cpu_percent": {<br>    "aggregation": "Average",<br>    "frequency": "PT5M",<br>    "metric_name": "cpu_percent",<br>    "metric_namespace": "Microsoft.DBforMySQL/flexibleServers",<br>    "operator": "GreaterThan",<br>    "severity": 2,<br>    "threshold": 80,<br>    "window_size": "PT30M"<br>  },<br>  "memory_percent": {<br>    "aggregation": "Average",<br>    "frequency": "PT5M",<br>    "metric_name": "memory_percent",<br>    "metric_namespace": "Microsoft.DBforMySQL/flexibleServers",<br>    "operator": "GreaterThan",<br>    "severity": 2,<br>    "threshold": 80,<br>    "window_size": "PT30M"<br>  },<br>  "storage_percent": {<br>    "aggregation": "Average",<br>    "frequency": "PT5M",<br>    "metric_name": "storage_percent",<br>    "metric_namespace": "Microsoft.DBforMySQL/flexibleServers",<br>    "operator": "GreaterThan",<br>    "severity": 2,<br>    "threshold": 80,<br>    "window_size": "PT30M"<br>  }<br>}</pre> | no |
| <a name="input_diagnostic_settings"></a> [diagnostic\_settings](#input\_diagnostic\_settings) | Define if diagnostic settings should be enabled.<br>if it is:<br>Specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and <br>the ID of the Storage Account where logs should be sent. (Changing this forces a new resource to be created) | <pre>object({<br>    enabled                                   = bool<br>    log_analytics_workspace_id                = string<br>    diagnostic_setting_destination_storage_id = string<br>  })</pre> | <pre>{<br>  "diagnostic_setting_destination_storage_id": null,<br>  "enabled": false,<br>  "log_analytics_workspace_id": null<br>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br>    prefix          = string<br>    env_short       = string<br>    location        = string<br>    domain          = optional(string)<br>    app_name        = string<br>    instance_number = string<br>  })</pre> | n/a | yes |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | Resource group of the private DNS zone | `string` | n/a | yes |
| <a name="input_replica_zone"></a> [replica\_zone](#input\_replica\_zone) | (Optional) Specifies the Availability Zone in which the Replica MySQL Flexible Server should be located. | `number` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | Id of the subnet which holds private endpoints | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on demanding workload. Allowed values are 'test', 'standard', 'premium'. | `string` | `"test"` | no |
| <a name="input_zone"></a> [zone](#input\_zone) | (Optional) Specifies the Availability Zone in which the MySQL Flexible Server should be located. | `number` | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_mysql"></a> [mysql](#output\_mysql) | MySQL Flexible Server |
| <a name="output_mysql_replica"></a> [mysql\_replica](#output\_mysql\_replica) | MySQL Flexible Server Replica |
| <a name="output_private_endpoint"></a> [private\_endpoint](#output\_private\_endpoint) | MySQL Private Endpoint resource ID |
| <a name="output_private_endpoint_replica"></a> [private\_endpoint\_replica](#output\_private\_endpoint\_replica) | MySQL Private Endpoint resource ID for a replica |
<!-- END OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
