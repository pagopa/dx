# link_with_external_storage

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| azurerm | >= 4.8.0, < 5.0 |
| dx | >= 0.0.6, < 1.0.0 |

## Resources

| Name | Type |
|------|------|
| azurerm_storage_account.external | resource |

## Modules

| Name | Source | Version |
|------|--------|---------|
| azure_function_app | pagopa-dx/azure-function-app/azurerm | ~> 4.1 |

## Example

This example demonstrates linking the Function App to an (external) Storage Account queue by using its primary_queue_endpoint attribute (azurerm_storage_account.external.primary_queue_endpoint) to populate AzureWebJobsStorage__queueServiceUri.

<!-- END_TF_DOCS -->
