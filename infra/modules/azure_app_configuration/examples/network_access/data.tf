data "azurerm_virtual_network" "e2e" {
  name                = local.e2e_virtual_network.name
  resource_group_name = local.e2e_virtual_network.resource_group_name
}

data "azurerm_subnet" "pep" {
  name = provider::pagopa-dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = data.azurerm_virtual_network.e2e.name
  resource_group_name  = data.azurerm_virtual_network.e2e.resource_group_name
}

data "azurerm_resource_group" "network" {
  name = provider::pagopa-dx::resource_name(merge(local.naming_config, {
    name          = "network"
    resource_type = "resource_group"
  }))
}
