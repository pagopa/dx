resource "azurerm_virtual_network" "vnet" {
  name = provider::dx::resource_name(merge(
    var.naming_config,
    {
      name          = "common",
      resource_type = "virtual_network",
  }))
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = [var.vnet_cidr]

  tags = var.tags
}