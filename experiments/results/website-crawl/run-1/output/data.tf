data "azurerm_virtual_network" "main" {
  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}
