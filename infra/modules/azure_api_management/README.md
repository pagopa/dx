# DX - Azure API Management

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-api-management/azurerm?label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-api-management%2Fazurerm%2Flatest&logo=terraform)

This module deploys an Azure API Management instance with optional configurations for networking, monitoring, autoscaling, and custom domains.

## Features

- **Azure API Management Instance**: Manage APIs, policies, and configurations.
- **Application Insights Integration**: Enable logging and monitoring of API requests and responses.
- **Autoscaling**: Configure autoscaling for Premium tier instances based on capacity metrics.
- **Private DNS A Records**: Create DNS records for internal API Management endpoints.
- **Network Security Group (NSG)**: Secure the API Management subnet with specific inbound rules.
- **Management Lock**: Prevent accidental deletion of the API Management instance.
- **Custom Domain Certificates**: Configure custom domains using certificates stored in Azure Key Vault.
- **Metric Alerts**: Set up alerts for monitoring API Management metrics.

## Tiers and Configurations

| Tier | Description                                                                                                                        | SLA  | Scalability      | Autoscaling | Zones Configured  | Metric Alerts |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------- | ----------- | ----------------- | ------------- |
| `s`  | Developer Tier, for development and testing.                                                                                       | None | Limited          | No          | No                | Disabled      |
| `m`  | Standard Tier, for production workloads.                                                                                           | Yes  | Moderate         | No          | No                | Enabled       |
| `l`  | Premium Tier, designed for large-scale production workloads.                                                                       | Yes  | High (Autoscale) | Yes         | `["1", "2"]`      | Enabled       |
| `xl` | Premium Tier, optimized for large-scale production workloads requiring maximum scalability, resilience, and multi-zone redundancy. | Yes  | High (Autoscale) | Yes         | `["1", "2", "3"]` | Enabled       |

## Monitoring

Azure creates some resources automatically when the `azurerm_monitor_diagnostic_setting` is created.
Those resources are necessary to see the logs within the `AzureDiagnostics` table in the Log Analytics workspace.  
Since Azure can take some time to create those resources, you may not see the logs immediately after the deployment.

## Usage Example

For a complete example of how to use this module, refer to the [example/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-api-management/tree/main/example/complete) folder in the module repository.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.1.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_api_management.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management) | resource |
| [azurerm_api_management_certificate.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_certificate) | resource |
| [azurerm_api_management_diagnostic.applicationinsights](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_diagnostic) | resource |
| [azurerm_api_management_logger.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_logger) | resource |
| [azurerm_api_management_policy.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management_policy) | resource |
| [azurerm_management_lock.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_lock) | resource |
| [azurerm_monitor_autoscale_setting.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting) | resource |
| [azurerm_monitor_diagnostic_setting.apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_monitor_metric_alert.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert) | resource |
| [azurerm_network_security_group.nsg_apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group) | resource |
| [azurerm_private_dns_a_record.apim_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record) | resource |
| [azurerm_private_dns_a_record.apim_management_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record) | resource |
| [azurerm_private_dns_a_record.apim_scm_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_dns_a_record) | resource |
| [azurerm_subnet_network_security_group_association.snet_nsg](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association) | resource |
| [azurerm_key_vault_certificate.key_vault_certificate](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_certificate) | data source |
| [azurerm_monitor_diagnostic_categories.apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/monitor_diagnostic_categories) | data source |
| [azurerm_private_dns_zone.azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_private_dns_zone.management_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_private_dns_zone.scm_azure_api_net](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_virtual_network.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | The ID of the Action Group of custom string properties to include with the post webhook operation. | `string` | `null` | no |
| <a name="input_application_insights"></a> [application\_insights](#input\_application\_insights) | Application Insights integration. The connection string used to push data; the id of the AI resource (optional); the sampling percentage (a value between 0 and 100) and the verbosity level (verbose, information, error). | <pre>object({<br/>    enabled             = bool<br/>    connection_string   = string<br/>    id                  = optional(string, null)<br/>    sampling_percentage = number<br/>    verbosity           = string<br/>  })</pre> | <pre>{<br/>  "connection_string": null,<br/>  "enabled": false,<br/>  "id": null,<br/>  "sampling_percentage": 0,<br/>  "verbosity": "error"<br/>}</pre> | no |
| <a name="input_autoscale"></a> [autoscale](#input\_autoscale) | Configure Apim autoscale rule on capacity metric | <pre>object(<br/>    {<br/>      enabled                       = bool<br/>      default_instances             = number<br/>      minimum_instances             = number<br/>      maximum_instances             = number<br/>      scale_out_capacity_percentage = number<br/>      scale_out_time_window         = string<br/>      scale_out_value               = string<br/>      scale_out_cooldown            = string<br/>      scale_in_capacity_percentage  = number<br/>      scale_in_time_window          = string<br/>      scale_in_value                = string<br/>      scale_in_cooldown             = string<br/>    }<br/>  )</pre> | <pre>{<br/>  "default_instances": 1,<br/>  "enabled": true,<br/>  "maximum_instances": 5,<br/>  "minimum_instances": 1,<br/>  "scale_in_capacity_percentage": 30,<br/>  "scale_in_cooldown": "PT30M",<br/>  "scale_in_time_window": "PT30M",<br/>  "scale_in_value": "1",<br/>  "scale_out_capacity_percentage": 60,<br/>  "scale_out_cooldown": "PT45M",<br/>  "scale_out_time_window": "PT10M",<br/>  "scale_out_value": "2"<br/>}</pre> | no |
| <a name="input_certificate_names"></a> [certificate\_names](#input\_certificate\_names) | List of key vault certificate name | `list(string)` | `[]` | no |
| <a name="input_enable_public_network_access"></a> [enable\_public\_network\_access](#input\_enable\_public\_network\_access) | Enable public network access | `bool` | `false` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_hostname_configuration"></a> [hostname\_configuration](#input\_hostname\_configuration) | Custom domains | <pre>object({<br/><br/>    proxy = list(object(<br/>      {<br/>        default_ssl_binding = bool<br/>        host_name           = string<br/>        key_vault_id        = string<br/>    }))<br/><br/>    management = object({<br/>      host_name    = string<br/>      key_vault_id = string<br/>    })<br/><br/>    portal = object({<br/>      host_name    = string<br/>      key_vault_id = string<br/>    })<br/><br/>    developer_portal = object({<br/>      host_name    = string<br/>      key_vault_id = string<br/>    })<br/><br/>  })</pre> | `null` | no |
| <a name="input_key_vault_id"></a> [key\_vault\_id](#input\_key\_vault\_id) | Key vault id. | `string` | `null` | no |
| <a name="input_lock_enable"></a> [lock\_enable](#input\_lock\_enable) | Apply lock to block accidental deletions. | `bool` | `false` | no |
| <a name="input_management_logger_application_insight_enabled"></a> [management\_logger\_application\_insight\_enabled](#input\_management\_logger\_application\_insight\_enabled) | (Optional) if false, disables management logger application insight block | `bool` | `true` | no |
| <a name="input_metric_alerts"></a> [metric\_alerts](#input\_metric\_alerts) | Map of name = criteria objects | <pre>map(object({<br/>    description = string<br/>    # Possible values are PT1M, PT5M, PT15M, PT30M and PT1H<br/>    frequency = string<br/>    # Possible values are PT1M, PT5M, PT15M, PT30M, PT1H, PT6H, PT12H and P1D.<br/>    window_size = string<br/>    # Possible values are 0, 1, 2, 3.<br/>    severity = number<br/>    # Possible values are true, false<br/>    auto_mitigate = bool<br/><br/>    criteria = set(object(<br/>      {<br/>        # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]<br/>        aggregation = string<br/>        dimension = list(object(<br/>          {<br/>            name     = string<br/>            operator = string<br/>            values   = list(string)<br/>          }<br/>        ))<br/>        metric_name      = string<br/>        metric_namespace = string<br/>        # criteria.0.operator to be one of [Equals NotEquals GreaterThan GreaterThanOrEqual LessThan LessThanOrEqual]<br/>        operator               = string<br/>        skip_metric_validation = bool<br/>        threshold              = number<br/>      }<br/>    ))<br/><br/>    dynamic_criteria = set(object(<br/>      {<br/>        # criteria.*.aggregation to be one of [Average Count Minimum Maximum Total]<br/>        aggregation       = string<br/>        alert_sensitivity = string<br/>        dimension = list(object(<br/>          {<br/>            name     = string<br/>            operator = string<br/>            values   = list(string)<br/>          }<br/>        ))<br/>        evaluation_failure_count = number<br/>        evaluation_total_count   = number<br/>        ignore_data_before       = string<br/>        metric_name              = string<br/>        metric_namespace         = string<br/>        operator                 = string<br/>        skip_metric_validation   = bool<br/>      }<br/>    ))<br/>  }))</pre> | `{}` | no |
| <a name="input_monitoring"></a> [monitoring](#input\_monitoring) | Enable collecting resources to send to Azure Monitor into AzureDiagnostics table | <pre>object({<br/>    enabled                    = bool<br/>    log_analytics_workspace_id = string<br/>    sampling_percentage        = number<br/>    verbosity                  = string<br/><br/>    logs = optional(object({<br/>      enabled    = bool<br/>      groups     = optional(list(string), [])<br/>      categories = optional(list(string), [])<br/>    }), { enabled = false, groups = [], categories = [] })<br/><br/>    metrics = optional(object({<br/>      enabled = bool<br/>    }), { enabled = false })<br/><br/>  })</pre> | <pre>{<br/>  "enabled": false,<br/>  "log_analytics_workspace_id": null,<br/>  "sampling_percentage": 0,<br/>  "verbosity": "error"<br/>}</pre> | no |
| <a name="input_notification_sender_email"></a> [notification\_sender\_email](#input\_notification\_sender\_email) | Email address from which the notification will be sent. | `string` | `null` | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | (Optional) The resource group name of the private DNS zone. This is only required when resource group name is different from the VNet resource group. | `string` | `null` | no |
| <a name="input_public_ip_address_id"></a> [public\_ip\_address\_id](#input\_public\_ip\_address\_id) | (Optional) The id of the public ip address that will be used for the API Management. Custom public IPs are only supported on the Premium and Developer tiers when deployed in a virtual network. | `string` | `null` | no |
| <a name="input_publisher_email"></a> [publisher\_email](#input\_publisher\_email) | The email of publisher/company. | `string` | n/a | yes |
| <a name="input_publisher_name"></a> [publisher\_name](#input\_publisher\_name) | The name of publisher/company. | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group to deploy resources to | `string` | n/a | yes |
| <a name="input_subnet_id"></a> [subnet\_id](#input\_subnet\_id) | The id of the subnet that will be used for the API Management. | `string` | `null` | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_tier"></a> [tier](#input\_tier) | Resource tiers depending on demanding workload. Allowed values are 's', 'm', 'l', 'xl'. | `string` | `"s"` | no |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | Virtual network in which to create the subnet | <pre>object({<br/>    name                = string<br/>    resource_group_name = string<br/>  })</pre> | n/a | yes |
| <a name="input_virtual_network_type_internal"></a> [virtual\_network\_type\_internal](#input\_virtual\_network\_type\_internal) | The type of virtual network you want to use, if true it will be Internal and you need to specify a subnet\_id, otherwise it will be None | `bool` | `true` | no |
| <a name="input_xml_content"></a> [xml\_content](#input\_xml\_content) | Xml content for all api policy | `string` | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_gateway_hostname"></a> [gateway\_hostname](#output\_gateway\_hostname) | n/a |
| <a name="output_gateway_url"></a> [gateway\_url](#output\_gateway\_url) | n/a |
| <a name="output_id"></a> [id](#output\_id) | n/a |
| <a name="output_logger_id"></a> [logger\_id](#output\_logger\_id) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | n/a |
| <a name="output_private_ip_addresses"></a> [private\_ip\_addresses](#output\_private\_ip\_addresses) | n/a |
| <a name="output_public_ip_addresses"></a> [public\_ip\_addresses](#output\_public\_ip\_addresses) | n/a |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | n/a |
<!-- END_TF_DOCS -->
