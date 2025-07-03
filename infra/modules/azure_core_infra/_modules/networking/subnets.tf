resource "azurerm_subnet" "pep_snet" {
  name = provider::dx::resource_name(merge(
    var.naming_config,
    {
      name          = "pep",
      resource_type = "subnet",
  }))
  virtual_network_name = azurerm_virtual_network.vnet.name
  resource_group_name  = var.resource_group_name
  address_prefixes     = [var.pep_snet_cidr]
}

resource "azurerm_subnet" "test_snet" {
  count = var.test_snet_cidr != null ? 1 : 0
  name = provider::dx::resource_name(merge(
    var.naming_config,
    {
      name          = "test",
      resource_type = "subnet",
  }))
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.test_snet_cidr]
  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}
