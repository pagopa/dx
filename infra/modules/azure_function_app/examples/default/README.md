# Entra ID - Managed Identity (Recommended)

This recommended example shows a Function App using **Entra ID (Azure AD) authentication** via Managed Identity.

Instead of function keys, callers (e.g. APIM) use their Managed Identity to obtain a signed JWT
from the configured Entra ID application, then present it in the `Authorization: Bearer` header.
The Function App validates the token and rejects unauthenticated or unauthorized requests with HTTP 401.

Function endpoints should use `authLevel: anonymous` since authentication is enforced at the
infrastructure level by the Function App auth middleware.

## Prerequisites

- An Entra ID application registration must exist to act as the token audience.
- The APIM instance (or other caller) must have a Managed Identity.
- The APIM policy must be configured to acquire a token for the audience application:
  ```xml
  <authentication-managed-identity resource="<audience_client_id>"/>
  ```

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azuread"></a> [azuread](#requirement\_azuread) | >= 3.0.0, < 4.0.0 |
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | >= 4.8.0, < 5.0 |
| <a name="requirement_dx"></a> [dx](#requirement\_dx) | >= 0.0.6, < 1.0.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_azure_function_app"></a> [azure\_function\_app](#module\_azure\_function\_app) | pagopa-dx/azure-function-app/azurerm | ~> 5.0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_resource_group.example](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group) | resource |
| [dx_available_subnet_cidr.example](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/resources/available_subnet_cidr) | resource |
| [azuread_application.function_app](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/application) | data source |
| [azuread_service_principal.apim](https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/data-sources/service_principal) | data source |
| [azurerm_subnet.pep](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subnet) | data source |
| [azurerm_subscription.current](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/subscription) | data source |
| [azurerm_virtual_network.example_vnet](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/virtual_network) | data source |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
