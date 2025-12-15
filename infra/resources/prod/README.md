# prod

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 6.0 |
| <a name="requirement_awsdx"></a> [awsdx](#requirement\_awsdx) | ~> 0.0 |
| <a name="requirement_azapi"></a> [azapi](#requirement\_azapi) | 2.8.0 |
| <a name="requirement_azuread"></a> [azuread](#requirement\_azuread) | ~> 2.0 |
| <a name="requirement_azuredx"></a> [azuredx](#requirement\_azuredx) | ~> 0.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | 0.1.3 |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.56.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_aws_core_values"></a> [aws\_core\_values](#module\_aws\_core\_values) | pagopa-dx/aws-core-values-exporter/aws | ~> 0.0 |
| <a name="module_azure_core_values"></a> [azure\_core\_values](#module\_azure\_core\_values) | pagopa-dx/azure-core-values-exporter/azurerm | ~> 0.0 |
| <a name="module_dx_website"></a> [dx\_website](#module\_dx\_website) | ../_modules/dx_website | n/a |
| <a name="module_mcp_registry"></a> [mcp\_registry](#module\_mcp\_registry) | ../_modules/mcp_registry | n/a |
| <a name="module_mcp_server"></a> [mcp\_server](#module\_mcp\_server) | ../_modules/mcp_server | n/a |

## Resources

| Name | Type |
|------|------|
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [azurerm_application_insights.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/application_insights) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
