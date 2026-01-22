# complete

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 3.111.0, < 5.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_app_service_1"></a> [azure\_app\_service\_1](#module\_azure\_app\_service\_1) | pagopa-dx/azure-app-service/azurerm | ~> 2.0 |
| <a name="module_azure_function_app_1"></a> [azure\_function\_app\_1](#module\_azure\_function\_app\_1) | pagopa-dx/azure-function-app/azure | ~> 4.2 |
| <a name="module_azure_function_app_2"></a> [azure\_function\_app\_2](#module\_azure\_function\_app\_2) | pagopa-dx/azure-function-app/azure | ~> 4.2 |
| <a name="module_func_autoscaler"></a> [func\_autoscaler](#module\_func\_autoscaler) | pagopa-dx/azure-app-service-plan-autoscaler/azurerm | ~> 2.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
