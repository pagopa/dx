# vpn

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azuread"></a> [azuread](#requirement\_azuread) | <= 3.02.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | <= 3.117.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_azuread"></a> [azuread](#provider\_azuread) | 3.0.2 |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 3.117.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_dns_forwarder"></a> [dns\_forwarder](#module\_dns\_forwarder) | github.com/pagopa/terraform-azurerm-v3//dns_forwarder | v8.33.1 |
| <a name="module_dns_forwarder_snet"></a> [dns\_forwarder\_snet](#module\_dns\_forwarder\_snet) | github.com/pagopa/terraform-azurerm-v3//subnet | v8.33.1 |
| <a name="module_vpn"></a> [vpn](#module\_vpn) | github.com/pagopa/terraform-azurerm-v3//vpn_gateway | v8.33.0 |
| <a name="module_vpn_snet"></a> [vpn\_snet](#module\_vpn\_snet) | github.com/pagopa/terraform-azurerm-v3//subnet | v8.33.1 |

## Resources

| Name | Type |
|------|------|
| [azuread_application.vpn_app_01](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/application) | data source |
| [azurerm_client_config.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/client_config) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
