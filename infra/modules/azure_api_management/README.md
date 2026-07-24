# DX - Azure API Management

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-api-management/azurerm?label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-api-management%2Fazurerm%2Flatest&logo=terraform)

This module deploys an Azure API Management instance with optional configurations for networking, monitoring, autoscaling, and custom domains.

![diagram](diagram.svg)

## Features

- **Azure API Management Instance**: Manage APIs, policies, and configurations.
- **Application Insights Integration**: Enable logging and monitoring of API requests and responses.
- **Autoscaling**: Configure autoscaling for non development use cases instances based on capacity metrics.
- **Private DNS A Records**: Create DNS records for internal API Management endpoints.
- **Network Security Group (NSG)**: Secure the API Management subnet with specific inbound rules.
- **Management Lock**: Prevent accidental deletion of the API Management instance.
- **Custom Domain Certificates**: Configure custom domains using certificates stored in Azure Key Vault.
- **Metric Alerts**: Set up alerts for monitoring API Management metrics.

## Use Cases and Configurations

| Use case         | Description                                     | SLA  | Scalability      | Autoscaling | Zones Configured | Metric Alerts |
| ---------------- | ----------------------------------------------- | ---- | ---------------- | ----------- | ---------------- | ------------- |
| `development`    | For development and testing purposes.           | None | Limited          | No          | No               | Disabled      |
| `cost_optimized` | The default use case, for production workloads. | Yes  | Moderate         | No          | No               | Enabled       |
| `high_load`      | Designed for large-scale production workloads.  | Yes  | High (Autoscale) | Yes         | `["1", "2"]`     | Enabled       |

## Monitoring

Azure creates some resources automatically when the `azurerm_monitor_diagnostic_setting` is created.
Those resources are necessary to see the logs within the `AzureDiagnostics` table in the Log Analytics workspace.  
Since Azure can take some time to create those resources, you may not see the logs immediately after the deployment.

## ⚠️ Note about `cost_optimized` use case ⚠️

The `cost_optimized` use case is designed to balance cost and performance for production workloads. However, it is important to note that it does not support **Backup and Restore** features ([Official documentation](https://learn.microsoft.com/en-us/azure/api-management/v2-service-tiers-overview#classic-feature-availability)).

## Usage Example

For a complete example of how to use this module, refer to the [example/complete](https://github.com/pagopa-dx/terraform-azurerm-azure-api-management/tree/main/example/complete) folder in the module repository.

## Troubleshooting

### ⚠️ Public Network Access Limitation ⚠️

Currently, it is not possible to create a new Azure API Management instance with `enable_public_network_access = false`.  
If you need to disable public network access, you must first create the APIM with `enable_public_network_access = true`.  
After that, submit a new _Pull Request_ to update the variable to `false` and apply the changes.

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.14.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.1 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | ~> 0.12 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_api_management.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management) | resource |
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
| [azurerm_private_endpoint.apim_pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint) | resource |
| [azurerm_public_ip.apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip) | resource |
| [azurerm_subnet.apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |
| [azurerm_subnet_network_security_group_association.snet_nsg](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association) | resource |
| [dx_available_subnet_cidr.apim](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [azurerm_application_insights.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/application_insights) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_action_group_id"></a> [action\_group\_id](#input\_action\_group\_id) | The ID of the custom string properties Action Group to include with the post webhook operation. | `string` | `null` | no |
| <a name="input_application_insights"></a> [application\_insights](#input\_application\_insights) | Application Insights integration. Set id to enable it; the module resolves the connection string from the resource ID. | <pre>object({<br/>    id                  = optional(string, null)<br/>    sampling_percentage = optional(number, 0)<br/>    verbosity           = optional(string, "error")<br/>  })</pre> | `{}` | no |
| <a name="input_autoscale"></a> [autoscale](#input\_autoscale) | Configuration for autoscaling rules on capacity metrics. | <pre>object(<br/>    {<br/>      default_instances             = optional(number)<br/>      minimum_instances             = optional(number)<br/>      maximum_instances             = optional(number)<br/>      scale_out_capacity_percentage = optional(number)<br/>      scale_out_time_window         = optional(string)<br/>      scale_out_value               = optional(string)<br/>      scale_out_cooldown            = optional(string)<br/>      scale_in_capacity_percentage  = optional(number)<br/>      scale_in_time_window          = optional(string)<br/>      scale_in_value                = optional(string)<br/>      scale_in_cooldown             = optional(string)<br/>    }<br/>  )</pre> | `null` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_hostname_configuration"></a> [hostname\_configuration](#input\_hostname\_configuration) | Custom domain configurations. The proxy hostname is managed by the module; only whether the resource-name hostname is the default can be configured. Key Vault certificate IDs may include a version; the module strips it internally. | <pre>object({<br/>    proxy = optional(object({<br/>      use_resource_name_as_default = optional(bool, false)<br/>    }), {})<br/>    management = optional(list(object({<br/>      host_name                = string<br/>      key_vault_certificate_id = string<br/>    })), [])<br/>    portal = optional(list(object({<br/>      host_name                = string<br/>      key_vault_certificate_id = string<br/>    })), [])<br/>    developer_portal = optional(list(object({<br/>      host_name                = string<br/>      key_vault_certificate_id = string<br/>    })), [])<br/>    scm = optional(list(object({<br/>      host_name                = string<br/>      key_vault_certificate_id = string<br/>    })), [])<br/>  })</pre> | `{}` | no |
| <a name="input_log_analytics_workspace_id"></a> [log\_analytics\_workspace\_id](#input\_log\_analytics\_workspace\_id) | The Log Analytics workspace ID used for diagnostic logs and metrics. Required when the selected use\_case enables monitoring. | `string` | `null` | no |
| <a name="input_metric_alerts"></a> [metric\_alerts](#input\_metric\_alerts) | Map of name = criteria objects | <pre>map(object({<br/>    description   = string<br/>    frequency     = string<br/>    window_size   = string<br/>    severity      = number<br/>    auto_mitigate = bool<br/><br/>    criteria = set(object(<br/>      {<br/>        aggregation = string<br/>        dimension = list(object(<br/>          {<br/>            name     = string<br/>            operator = string<br/>            values   = list(string)<br/>          }<br/>        ))<br/>        metric_name            = string<br/>        metric_namespace       = string<br/>        operator               = string<br/>        skip_metric_validation = bool<br/>        threshold              = number<br/>      }<br/>    ))<br/><br/>    dynamic_criteria = set(object(<br/>      {<br/>        aggregation              = string<br/>        alert_sensitivity        = string<br/>        dimension                = list(object({ name = string, operator = string, values = list(string) }))<br/>        evaluation_failure_count = number<br/>        evaluation_total_count   = number<br/>        ignore_data_before       = string<br/>        metric_name              = string<br/>        metric_namespace         = string<br/>        operator                 = string<br/>        skip_metric_validation   = bool<br/>      }<br/>    ))<br/>  }))</pre> | `{}` | no |
| <a name="input_private_dns_zone_resource_group_name"></a> [private\_dns\_zone\_resource\_group\_name](#input\_private\_dns\_zone\_resource\_group\_name) | The resource group name of the private DNS zones. Defaults to the Virtual Network resource group. Zones are resolved in the current subscription. | `string` | `null` | no |
| <a name="input_publisher_email"></a> [publisher\_email](#input\_publisher\_email) | The email address of the publisher or company. Also used as the notification sender email. | `string` | n/a | yes |
| <a name="input_publisher_name"></a> [publisher\_name](#input\_publisher\_name) | The name of the publisher or company. | `string` | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | The name of the resource group where the resources will be deployed. | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | A map of tags to assign to the resources. | `map(any)` | n/a | yes |
| <a name="input_use_case"></a> [use\_case](#input\_use\_case) | Specifies the use case for the API Management. Allowed values are 'cost\_optimized', 'high\_load', and 'development'. | `string` | `"cost_optimized"` | no |
| <a name="input_virtual_network"></a> [virtual\_network](#input\_virtual\_network) | The resource ID of the virtual network in which to create the APIM subnet and resolve private endpoint subnets. | `string` | n/a | yes |
| <a name="input_xml_content"></a> [xml\_content](#input\_xml\_content) | XML content for all API policies. | `string` | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_gateway_hostname"></a> [gateway\_hostname](#output\_gateway\_hostname) | The hostname of the Azure API Management gateway. |
| <a name="output_gateway_url"></a> [gateway\_url](#output\_gateway\_url) | The URL of the Azure API Management gateway. |
| <a name="output_id"></a> [id](#output\_id) | The resource ID of the Azure API Management instance. |
| <a name="output_logger_id"></a> [logger\_id](#output\_logger\_id) | The ID of the Application Insights logger associated with the Azure API Management instance (null if Application Insights is disabled). |
| <a name="output_name"></a> [name](#output\_name) | The name of the Azure API Management instance. |
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | The principal ID of the Azure API Management instance, used for role assignments. |
| <a name="output_private_ip_addresses"></a> [private\_ip\_addresses](#output\_private\_ip\_addresses) | The private IP addresses assigned to the Azure API Management instance. |
| <a name="output_public_ip_addresses"></a> [public\_ip\_addresses](#output\_public\_ip\_addresses) | The public IP addresses assigned to the Azure API Management instance. |
| <a name="output_public_ip_id"></a> [public\_ip\_id](#output\_public\_ip\_id) | The ID of the public IP address managed by this module, when required by the selected use case. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the resource group where the Azure API Management instance is deployed. |
| <a name="output_subnet"></a> [subnet](#output\_subnet) | The APIM subnet managed by this module. |
<!-- END_TF_DOCS -->
