resource "azurerm_subnet" "pep_snet" {
  name = provider::dx::resource_name(merge(
    var.naming_config
    {
      name          = "pep",
      resource_type = "subnet",
  }))
  virtual_network_name = azurerm_virtual_network.vnet.name
  resource_group_name  = var.resource_group_name
  address_prefixes     = [var.pep_snet_cidr]
}