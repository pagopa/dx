# DX - Azure CDN (Front Door)

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-cdn/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-cdn%2Fazurerm%2Flatest)

This Terraform module provisions an Azure CDN Front Door profile with endpoints, origins, and routing rules.

## Features

- **Azure Front Door CDN Profile**: Provisions a Standard Microsoft SKU profile.
- **Origin Configuration**: Supports health probes and priority-based routing.
- **Custom Domains**: Associates custom domains with the CDN endpoint, including DNS record creation.
- **Diagnostic Settings**: Configurable diagnostic settings for monitoring and logging.
- **Routing Rules**: Allows custom routing rules via the `azurerm_cdn_frontdoor_rule` resource to link to the rule set provided by the module.

### Routing rules
The module returns the id of a FrontDoor rule set via the `rule_set_id` output. The user can then implement ad-hoc rules for the created FrontDoor endpoint as follows:

```
module "azure_cdn" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.0"
  ...
}

resource "azurerm_cdn_frontdoor_rule" "example" {
  name                      = "examplerule"
  cdn_frontdoor_rule_set_id = module.azure_cdn.rule_set_id
  order                     = 1
  behavior_on_match         = "Continue"

  actions {
    url_redirect_action {
      redirect_type        = "PermanentRedirect"
      redirect_protocol    = "MatchRequest"
      query_string         = "clientIp={client_ip}"
      destination_path     = "/exampleredirection"
      destination_hostname = "contoso.com"
      destination_fragment = "UrlRedirect"
    }
  }

  conditions {
    host_name_condition {
      operator         = "Equal"
      negate_condition = false
      match_values     = ["www.contoso.com", "images.contoso.com", "video.contoso.com"]
      transforms       = ["Lowercase", "Trim"]
    }
  }
}
```

### Custom domains

The module supports custom domains, allowing you to expose your Azure CDN through your own domain names instead of the default Azure-provided endpoints. For most custom domains, the module automatically provisions and manages Azure CDN's managed certificates for HTTPS. 

However, for apex domains (domains where the host_name equals to the dns zone name specified in custom_domains.dns.zone_name), Azure CDN does not support managed certificates. An example is `apex.foo.com`, where `apex.foo.com` is the DNS zone name.

In the case of apex domains, it's possible to refer to the following configuration example:
```
data "azurerm_key_vault" "kv" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "key_vault"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "resource_group"
  }))
}

data "azurerm_key_vault_certificate" "cert" {
  name         = "my-secret-certificate"
  key_vault_id = data.azurerm_key_vault.kv.id
}

module "azure_cdn" {
  source  = "pagopa-dx/azure-cdn/azurerm"
  version = "~> 0.0"

  ...
  custom_domains = [
    {
      # This is an apex domain cause host_name equals to zone_name
      host_name = "apex.foo.com",
      dns = {
        zone_name                = "apex.foo.com",
        zone_resource_group_name = azurerm_resource_group.example.name
      }
      custom_certificate = {
        key_vault_certificate_versionless_id = data.azurerm_key_vault_certificate.cert.versionless_id
        key_vault_name                       = data.azurerm_key_vault.kv.name
        key_vault_resource_group_name        = data.azurerm_key_vault.kv.resource_group_name
        key_vault_has_rbac_support           = data.azurerm_key_vault.kv.enable_rbac_authorization
      }
    }
  ]
  ...
}
```
In these cases, you must provide custom certificate information through the custom_certificate object, specifying details for a certificate generated according to the "Azure - TLS Certificati con Let's Encrypt" confluence page.

## Usage Example

A complete example of how to use this module can be found in the [examples/basic](https://github.com/pagopa-dx/terraform-azurerm-azure-cdn/tree/main/examples/basic) directory.

## Diagram
<!-- BEGIN_TF_GRAPH -->
<!-- END_TF_GRAPH -->

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.15.0, < 5.0 |
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
| [azurerm_cdn_frontdoor_rule_set.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_rule_set) | resource |
| [azurerm_cdn_frontdoor_secret.certificate](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cdn_frontdoor_secret) | resource |
| [azurerm_dns_a_record.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_a_record) | resource |
| [azurerm_dns_cname_record.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record) | resource |
| [azurerm_dns_txt_record.validation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_txt_record) | resource |
| [azurerm_key_vault_access_policy.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_access_policy) | resource |
| [azurerm_monitor_diagnostic_setting.diagnostic_settings_cdn_profile](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting) | resource |
| [azurerm_role_assignment.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_key_vault.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_custom_domains"></a> [custom\_domains](#input\_custom\_domains) | Map of custom domain configurations to associate with the CDN endpoint. If dns parameter is set, DNS records are created. If the custom domain is at the apex of the specified DNS zone, a custom certificate must be used. To generate one in PagoPA context, please refer to the Confluence documentation. | <pre>list(object({<br/>    host_name = string<br/>    dns = optional(object({<br/>      zone_name                = string<br/>      zone_resource_group_name = string<br/>    }), { zone_name = null, zone_resource_group_name = null })<br/><br/>    custom_certificate = optional(object({<br/>      key_vault_certificate_versionless_id = string<br/>      key_vault_name                       = string<br/>      key_vault_resource_group_name        = string<br/>      key_vault_has_rbac_support           = optional(bool, true)<br/>    }), { key_vault_certificate_versionless_id = null, key_vault_name = null, key_vault_resource_group_name = null, key_vault_has_rbac_support = null })<br/>  }))</pre> | `[]` | no |
| <a name="input_diagnostic_settings"></a> [diagnostic\_settings](#input\_diagnostic\_settings) | Define if diagnostic settings should be enabled.<br/>if it is:<br/>Specifies the ID of a Log Analytics Workspace where Diagnostics Data should be sent and<br/>the ID of the Storage Account where logs should be sent. (Changing this forces a new resource to be created) | <pre>object({<br/>    enabled                                   = bool<br/>    log_analytics_workspace_id                = string<br/>    diagnostic_setting_destination_storage_id = string<br/>  })</pre> | <pre>{<br/>  "diagnostic_setting_destination_storage_id": null,<br/>  "enabled": false,<br/>  "log_analytics_workspace_id": null<br/>}</pre> | no |
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
| <a name="output_principal_id"></a> [principal\_id](#output\_principal\_id) | The principal ID of the Front Door Profile's system-assigned managed identity. |
| <a name="output_resource_group_name"></a> [resource\_group\_name](#output\_resource\_group\_name) | The name of the resource group the CDN FrontDoor Profile was created in |
| <a name="output_rule_set_id"></a> [rule\_set\_id](#output\_rule\_set\_id) | The ID of the CDN FrontDoor Rule Set |
<!-- END_TF_DOCS -->
