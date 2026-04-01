# Legacy (Key-based) authentication example.
# Azure Function App is protected by function keys that callers must include
# in the `x-functions-key` HTTP header. Keys are typically stored in Key Vault
# and injected by APIM at request time.
# Function endpoints should use authLevel: function (or higher).

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
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

  tags = local.tags
}
