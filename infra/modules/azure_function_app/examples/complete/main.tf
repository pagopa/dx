data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_subscription" "current" {}

provider "azuread" {}

data "azuread_application" "example" {
  display_name = "example-function-app"
}

data "azuread_service_principal" "example_caller" {
  display_name = "example-apim"
}

resource "azurerm_resource_group" "example" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = local.environment.domain,
    resource_type = "resource_group"
  }))
  location = local.environment.location
}

module "azure_function_app" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.1"

  environment         = local.environment
  use_case            = "default"
  resource_group_name = azurerm_resource_group.example.name

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = "10.50.248.0/24"

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  tags = local.tags
}

# Function App with Entra ID authentication.
# When set, callers (e.g. APIM) must authenticate via their Managed Identity
# to obtain a valid JWT from the Entra application before invoking the Function App.
# Requires an existing Entra ID application registration.
module "azure_function_app_with_entra_auth" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 4.1"

  environment         = merge(local.environment, { app_name = "auth" })
  use_case            = "default"
  resource_group_name = azurerm_resource_group.example.name

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_cidr   = "10.50.249.0/24"

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  entra_id_authentication = {
    audience_client_id         = data.azuread_application.example.client_id
    allowed_callers_client_ids = [data.azuread_service_principal.example_caller.client_id]
    tenant_id                  = data.azurerm_subscription.current.tenant_id
  }

  tags = local.tags
}
