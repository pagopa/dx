# DX - Azure CDN (Front Door)

This Terraform module provisions an Azure CDN Front Door profile with endpoints, origins, and routing rules.

## Features

- **Azure Front Door CDN Profile**: Provisions a Standard Microsoft SKU profile.
- **Origin Configuration**: Supports health probes and priority-based routing.
- **Custom Domains**: Associates custom domains with the CDN endpoint, including DNS record creation.
- **Routing Rules**: Enables custom routing rules, URL rewriting, and redirects.
- **Diagnostic Settings**: Configurable diagnostic settings for monitoring and logging.

## Usage Example

A complete example of how to use this module can be found in the [examples/basic](https://github.com/pagopa-dx/terraform-azurerm-azure-cdn/tree/main/examples/basic) directory.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.100.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [azurerm_cdn_frontdoor_custom_domain.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_custom_domain) | resource |
| [azurerm_cdn_frontdoor_custom_domain_association.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_custom_domain_association) | resource |
| [azurerm_cdn_frontdoor_endpoint.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_endpoint) | resource |
| [azurerm_cdn_frontdoor_origin.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_origin) | resource |
| [azurerm_cdn_frontdoor_origin_group.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_origin_group) | resource |
| [azurerm_cdn_frontdoor_profile.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_profile) | resource |
| [azurerm_cdn_frontdoor_route.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_route) | resource |
| [azurerm_dns_a_record.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_a_record) | resource |
| [azurerm_dns_txt_record.validation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_txt_record) | resource |
| [azurerm_monitor_diagnostic_setting.diagnostic_settings_cdn_profile](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_custom_domains"></a> [custom\_domains](#input\_custom\_domains) | Map of custom domain configurations to associate with the CDN endpoint. If dns parameter is set, DNS records are created. | <pre>list(object({<br/>    host_name = string<br/>    dns = optional(object({<br/>      zone_name                = string<br/>      zone_resource_group_name = string<br/>    }), { zone_name = null, zone_resource_group_name = null })<br/>  }))</pre> | `[]` | no |
| <a name="input_diagnostic_settings"></a> [diagnostic\_settings](#input\_diagnostic\_settings) | Define if diagnostic settings should be enabled.<br/>if it is:<br/>Specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and <br/>the ID of the Storage Account where logs should be sent. (Changing this forces a new resource to be created) | <pre>object({<br/>    enabled                                   = bool<br/>    log_analytics_workspace_id                = string<br/>    diagnostic_setting_destination_storage_id = string<br/>  })</pre> | <pre>{<br/>  "diagnostic_setting_destination_storage_id": null,<br/>  "enabled": false,<br/>  "log_analytics_workspace_id": null<br/>}</pre> | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Environment configuration object for resource naming | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_origins"></a> [origins](#input\_origins) | Map of origin configurations. Key is the origin identifier. Priority determines routing preference (lower values = higher priority) | <pre>map(object({<br/>    host_name = string<br/>    priority  = optional(number, 1)<br/>  }))</pre> | n/a | yes |
| <a name="input_resource_group_name"></a> [resource\_group\_name](#input\_resource\_group\_name) | Resource group name where the CDN profile will be created | `string` | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resource tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_endpoint_hostname"></a> [endpoint\_hostname](#output\_endpoint\_hostname) | The hostname of the CDN FrontDoor Endpoint |
| <a name="output_id"></a> [id](#output\_id) | The ID of the CDN FrontDoor Profile |
| <a name="output_name"></a> [name](#output\_name) | The name of the CDN FrontDoor Profile |
| <a name="output_origin_group_id"></a> [origin\_group\_id](#output\_origin\_group\_id) | The ID of the CDN FrontDoor Origin Group |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the resource group the CDN FrontDoor Profile was created in |
<!-- END_TF_DOCS -->
