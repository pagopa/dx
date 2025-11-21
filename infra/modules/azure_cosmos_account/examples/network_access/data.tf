data "azurerm_virtual_network" "network" {
  name                = local.virtual_network.name
  resource_group_name = local.virtual_network.resource_group_name
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = data.azurerm_virtual_network.network.name
  resource_group_name  = data.azurerm_virtual_network.network.resource_group_name
}

data "azurerm_resource_group" "e2e" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = ""
    resource_type = "resource_group"
  }))
}
