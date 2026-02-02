# dev

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 6.0 |
| <a name="requirement_awscc"></a> [awscc](#requirement\_awscc) | ~> 1.0 |
| <a name="requirement_awsdx"></a> [awsdx](#requirement\_awsdx) | ~> 0.0 |
| <a name="requirement_azapi"></a> [azapi](#requirement\_azapi) | 2.8.0 |
| <a name="requirement_azuread"></a> [azuread](#requirement\_azuread) | ~> 2.0 |
| <a name="requirement_azuredx"></a> [azuredx](#requirement\_azuredx) | ~> 0.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | ~> 4.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | 0.1.4 |
| <a name="provider_azurerm"></a> [azurerm](#provider\_azurerm) | 4.58.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_aws_core_values"></a> [aws\_core\_values](#module\_aws\_core\_values) | pagopa-dx/aws-core-values-exporter/aws | ~> 0.0 |
| <a name="module_azure_core_values"></a> [azure\_core\_values](#module\_azure\_core\_values) | pagopa-dx/azure-core-values-exporter/azurerm | ~> 0.0 |
| <a name="module_mcp_server"></a> [mcp\_server](#module\_mcp\_server) | ../_modules/mcp_server | n/a |
| <a name="module_testing"></a> [testing](#module\_testing) | ../_modules/testing | n/a |

## Resources

| Name | Type |
|------|------|
| [azurerm_role_assignment.infra_cd_key_vault_crypto](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment) | resource |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [azurerm_application_insights.this](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/application_insights) | data source |
| [azurerm_private_dns_zone.tests_peps](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/private_dns_zone) | data source |
| [azurerm_resource_group.dx](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/resource_group) | data source |
| [azurerm_subnet.runner](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_subnet.subnets](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |
| [azurerm_user_assigned_identity.infra_cd](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/user_assigned_identity) | data source |
| [azurerm_virtual_network.common](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
