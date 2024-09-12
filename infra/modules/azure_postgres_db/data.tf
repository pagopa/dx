data "azurerm_resource_group" "this" {
  name = var.resource_group_name
}

#------------#
# Networking #
#------------#

data "azurerm_virtual_network" "this" {
  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}

data "azurerm_resource_group" "vnet_rg" {
  name = var.virtual_network.resource_group_name
}