# Managed Identity (Entra ID) authentication example.
# Azure Function App is protected by Entra ID token validation instead of function keys.
# Callers (e.g. APIM) use their Managed Identity to obtain a signed JWT from the
# Entra application, then include it in the Authorization: Bearer header.
# Unauthenticated or unauthorized requests receive HTTP 401.
#
# Prerequisites:
# - An Entra ID application registration must exist (audience_client_id).
# - The caller's service principal must be listed in allowed_callers_client_ids.
# - The APIM policy must include:
#     <authentication-managed-identity resource="<audience_client_id>"/>
# - Function endpoints should use authLevel: anonymous because authentication
#   is enforced at the infrastructure level by the Function App auth middleware.

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_subscription" "current" {}

# The Entra ID application that acts as the audience for incoming JWT tokens.
# Its client_id is used as the `aud` claim that the Function App validates.
data "azuread_application" "function_app" {
  display_name = "example-function-app"
}

# The service principal of the caller (e.g. APIM) whose Managed Identity
# is allowed to invoke the Function App.
data "azuread_service_principal" "apim" {
  display_name = "example-apim"
}

data "azurerm_virtual_network" "example_vnet" {
  name                = local.virtual_network.name
  resource_group_name = local.virtual_network.resource_group_name
}

resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = local.environment.domain,
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

resource "dx_available_subnet_cidr" "example" {
  virtual_network_id = data.azurerm_virtual_network.example_vnet.id
  prefix_length      = 24
}

module "azure_function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 5.0"

  environment         = local.environment
  use_case            = "default"
  resource_group_name = azurerm_resource_group.example.name

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = dx_available_subnet_cidr.example.cidr_block

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  # Enables Entra ID (Azure AD) authentication on the Function App.
  # Callers must present a valid JWT issued by the specified tenant for the
  # given audience. Only service principals listed in allowed_callers_client_ids
  # are permitted; all others receive HTTP 401.
  entra_id_authentication = {
    audience_client_id = data.azuread_application.function_app.client_id
    allowed_callers_client_ids = [
      data.azuread_service_principal.apim.client_id
    ]
    tenant_id = data.azurerm_subscription.current.tenant_id
  }

  tags = local.tags
}
