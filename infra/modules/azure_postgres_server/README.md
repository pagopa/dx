# DX - Azure PostgreSQL Flexible Server

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-postgres-server/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-postgres-server%2Fazurerm%2Flatest)

This Terraform module provisions an Azure PostgreSQL Flexible Server along with optional configurations for high availability, monitoring, and private networking.

## Features

- **Primary and Replica Servers**: Provisions a primary PostgreSQL Flexible Server and optionally a replica server for read scaling.
- **High Availability**: Supports zone-redundant high availability for production-grade reliability.
- **Monitoring**: Includes default and customizable metric alerts, as well as diagnostic settings for logs and metrics to ensure operational visibility.
- **Connection Pooling**: Enables PgBouncer for efficient connection pooling, reducing overhead for high-connection scenarios.
- **Private Networking**: Integrates private endpoints and DNS zone configurations for secure and isolated network access.
- **Backup and Recovery**: Configurable backup retention and geo-redundant backups for disaster recovery.
- **Scalability**: Supports auto-grow storage and scaling configurations for dynamic workload demands.
- **Management Lock**: Adds a management lock to prevent accidental deletion of critical resources.

## Tier Comparison

| Tier | Description                                                      | High Availability | Geo-Redundant Backup  | Replica Server | Auto Grow |
|------|------------------------------------------------------------------|-------------------|-----------------------|----------------|-----------|
| `s`  | Ideal for lightweight workloads, testing, and development.       | None              | None                  | None           | None      |
| `m`  | Suitable for production with low to moderate performance needs.  | Yes               | Yes                   | None           | Yes       |
| `l`  | Best for high-demand production workloads with scaling needs.    | Yes               | Yes                   | Yes            | Yes       |

## Usage Example

A complete example of how to use this module can be found in the [example/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-postgres-server/tree/main/example/complete) directory.

## Diagram
<!-- START_TF_GRAPH -->
```mermaid
graph LR

subgraph PostgreSQL Servers
  PostgresPrimary["PostgreSQL Flexible Server (Primary)"]
  PostgresReplica["PostgreSQL Flexible Server (Replica)"]
end

subgraph Monitoring
  ManagementLock["Management Lock"]
  DSPrimary["Diagnostic Setting (Primary)"]
  MAPrimary["Metric Alert (Primary)"]
  DSReplica["Diagnostic Setting (Replica)"]
  MAReplica["Metric Alert (Replica)"]
end

subgraph Configurations
  ConfigPrimary["PgBouncer Configuration (Primary)"]
  ConfigReplica["PgBouncer Configuration (Replica)"]
end

subgraph Networking
  PrivateEndpointPrimary["Private Endpoint (Primary)"]
  PrivateEndpointReplica["Private Endpoint (Replica)"]
  VirtualEndpoint["Flexible Server Virtual Endpoint"]
  DNSZone["Private DNS Zone"]
end

ManagementLock --> PostgresPrimary
DSPrimary --> PostgresPrimary
MAPrimary --> PostgresPrimary
DSReplica --> PostgresReplica
MAReplica --> PostgresReplica
PostgresReplica --> PostgresPrimary
PostgresPrimary --> DNSZone
ConfigPrimary --> PostgresPrimary
ConfigReplica --> PostgresReplica
VirtualEndpoint --> PostgresReplica
PrivateEndpointPrimary --> PostgresPrimary
PrivateEndpointReplica --> PostgresReplica
```

<!-- END_TF_GRAPH -->

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.116, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_management_lock.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_lock) | resource |
| [azurerm_monitor_diagnostic_setting.replica](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_monitor_diagnostic_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_monitor_metric_alert.replica](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_monitor_metric_alert.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_postgresql_flexible_server.replica](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server) | resource |
| [azurerm_postgresql_flexible_server.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server) | resource |
| [azurerm_postgresql_flexible_server_configuration.pgbouncer](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server_configuration) | resource |
| [azurerm_postgresql_flexible_server_configuration.pgbouncer_replica](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server_configuration) | resource |
| [azurerm_postgresql_flexible_server_virtual_endpoint.endpoint](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server_virtual_endpoint) | resource |
| [azurerm_private_endpoint.postgre_pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_endpoint.replica_postgre_pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_private_dns_zone.postgre_dns_zone](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_administrator_credentials"></a> [administrator\_credentials](#input\_administrator\_credentials) | Administrator credentials for the PostgreSQL Flexible Server, including username and password. | <pre>object({<br/>    name     = string<br/>    password = string<br/>  })</pre> | n/a | yes |
| <a name="input_alert_action"></a> [alert\_action](#input\_alert\_action) | The ID of the Action Group and optional map of custom string properties to include with the post webhook operation. | <pre>list(object(<br/>    {<br/>      action_group_id = string<br/>    }<br/>  ))</pre> | `[]` | no |
| <a name="input_alerts_enabled"></a> [alerts\_enabled](#input\_alerts\_enabled) | Define if alerts should be enabled. | `bool` | `false` | no |
| <a name="input_backup_retention_days"></a> [backup\_retention\_days](#input\_backup\_retention\_days) | Number of days to retain backups. Valid values range from 7 to 35. Defaults to 7. | `number` | `7` | no |
| <a name="input_custom_metric_alerts"></a> [custom\_metric\_alerts](#input\_custom\_metric\_alerts) | Map of name = criteria objects | <pre>map(object({<br/>    # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]<br/>    aggregation = string<br/>    metric_name = string<br/>    # "Insights.Container/pods" "Insights.Container/nodes"<br/>    metric_namespace = string<br/>    # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]<br/>    operator  = string<br/>    threshold = number<br/>    # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H<br/>    frequency = string<br/>    # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.<br/>    window_size = string<br/>    # severity: The severity of this Metric Alert. Possible values are 0, 1, 2, 3 and 4. Defaults to 3.<br/>    severity = number<br/>  }))</pre> | `null` | no |
| <a name="input_db_version"></a> [db\_version](#input\_db\_version) | Specifies the PostgreSQL version to use. Supported versions are 11, 12, 13, 14, 15, and 16. Defaults to 16. | `string` | `"16"` | no |
| <a name="input_default_metric_alerts"></a> [default\_metric\_alerts](#input\_default\_metric\_alerts) | Map of name = criteria objects | <pre>map(object({<br/>    # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]<br/>    aggregation = string<br/>    metric_name = string<br/>    # "Insights.Container/pods" "Insights.Container/nodes"<br/>    metric_namespace = string<br/>    # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]<br/>    operator  = string<br/>    threshold = number<br/>    # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H<br/>    frequency = string<br/>    # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.<br/>    window_size = string<br/>    # severity: The severity of this Metric Alert. Possible values are 0, 1, 2, 3 and 4. Defaults to 3.<br/>    severity = number<br/>  }))</pre> | <pre>{<br/>  "active_connections": {<br/>    "aggregation": "Average",<br/>    "frequency": "PT5M",<br/>    "metric_name": "active_connections",<br/>    "metric_namespace": "Microsoft.DBforPostgreSQL/flexibleServers",<br/>    "operator": "GreaterThan",<br/>    "severity": 2,<br/>    "threshold": 80,<br/>    "window_size": "PT30M"<br/>  },<br/>  "connections_failed": {<br/>    "aggregation": "Total",<br/>    "frequency": "PT5M",<br/>    "metric_name": "connections_failed",<br/>    "metric_namespace": "Microsoft.DBforPostgreSQL/flexibleServers",<br/>    "operator": "GreaterThan",<br/>    "severity": 2,<br/>    "threshold": 80,<br/>    "window_size": "PT30M"<br/>  },<br/>  "cpu_percent": {<br/>    "aggregation": "Average",<br/>    "frequency": "PT5M",<br/>    "metric_name": "cpu_percent",<br/>    "metric_namespace": "Microsoft.DBforPostgreSQL/flexibleServers",<br/>    "operator": "GreaterThan",<br/>    "severity": 2,<br/>    "threshold": 80,<br/>    "window_size": "PT30M"<br/>  },<br/>  "memory_percent": {<br/>    "aggregation": "Average",<br/>    "frequency": "PT5M",<br/>    "metric_name": "memory_percent",<br/>    "metric_namespace": "Microsoft.DBforPostgreSQL/flexibleServers",<br/>    "operator": "GreaterThan",<br/>    "severity": 2,<br/>    "threshold": 80,<br/>    "window_size": "PT30M"<br/>  },<br/>  "storage_percent": {<br/>    "aggregation": "Average",<br/>    "frequency": "PT5M",<br/>    "metric_name": "storage_percent",<br/>    "metric_namespace": "Microsoft.DBforPostgreSQL/flexibleServers",<br/>    "operator": "GreaterThan",<br/>    "severity": 2,<br/>    "threshold": 80,<br/>    "window_size": "PT30M"<br/>  }<br/>}</pre> | no |
| <a name="input_delegated_subnet_id"></a> [delegated\_subnet\_id](#input\_delegated\_subnet\_id) | The ID of the subnet to which the PostgreSQL Flexible Server will be delegated. | `string` | `null` | no |
| <a name="input_diagnostic_settings"></a> [diagnostic\_settings](#input\_diagnostic\_settings) | Define if diagnostic settings should be enabled.<br/>if it is:<br/>Specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and <br/>the ID of the Storage Account where logs should be sent. (Changing this forces a new resource to be created) | <pre>object({<br/>    enabled                                   = bool<br/>    log_analytics_workspace_id                = string<br/>    diagnostic_setting_destination_storage_id = string<br/>  })</pre> | <pre>{<br/>  "diagnostic_setting_destination_storage_id": null,<br/>  "enabled": false,<br/>  "log_analytics_workspace_id": null<br/>}</pre> | no |
| <a name="input_enable_lock"></a> [enable\_lock](#input\_enable\_lock) | Define if lock should be enabled. | `bool` | `true` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_high_availability_override"></a> [high\_availability\_override](#input\_high\_availability\_override) | Override if high availability should be enabled. | `bool` | `false` | no |
| <a name="input_pgbouncer_enabled"></a> [pgbouncer\_enabled](#input\_pgbouncer\_enabled) | Indicates whether PgBouncer, a connection pooling tool, is enabled. Defaults to true. | `bool` | `true` | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | The name of the resource group containing the private DNS zone. | `string` | n/a | yes |
| <a name="input_replica_zone"></a> [replica\_zone](#input\_replica\_zone) | Specifies the Availability Zone in which the Replica PostgreSQL Flexible Server should be located. | `string` | `null` | no |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where resources will be deployed. | `string` | n/a | yes |
| <a name="input_storage_mb"></a> [storage\_mb](#input\_storage\_mb) | The max storage allowed for the PostgreSQL Flexible Server. Possible values are 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, and 33554432. | `number` | `32768` | no |
| <a name="input_subnet_pep_id"></a> [subnet\_pep\_id](#input\_subnet\_pep\_id) | The ID of the subnet used for private endpoints. | `string` | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on demanding workload. Allowed values are 's', 'm', 'l'. | `string` | `"s"` | no |
| <a name="input_zone"></a> [zone](#input\_zone) | Specifies the Availability Zone in which the PostgreSQL Flexible Server should be located. | `string` | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_postgres"></a> [postgres](#output\_postgres) | Details of the PostgreSQL Flexible Server, including its name, ID, and resource group name. |
| <a name="output_postgres_replica"></a> [postgres\_replica](#output\_postgres\_replica) | Details of the PostgreSQL Flexible Server Replica, including its name and ID. Returns an empty object if the tier is not 'l'. |
| <a name="output_private_endpoint"></a> [private\_endpoint](#output\_private\_endpoint) | The resource ID of the Private Endpoint associated with the PostgreSQL Flexible Server. |
| <a name="output_private_endpoint_replica"></a> [private\_endpoint\_replica](#output\_private\_endpoint\_replica) | The resource ID of the Private Endpoint associated with the PostgreSQL Flexible Server Replica. Returns null if the tier is not 'l'. |
<!-- END_TF_DOCS -->
