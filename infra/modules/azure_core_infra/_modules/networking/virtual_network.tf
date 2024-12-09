resource "azurerm_virtual_network" "vnet" {
  name                = "${var.project}-common-vnet-01"
  resource_group_name = var.resource_group_name
  location            = var.location
  address_space       = [var.vnet_cidr]

  tags = var.tags
}