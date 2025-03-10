data "azurerm_virtual_network" "this" {
  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}

data "azurerm_private_dns_zone" "this" {
  name                = "privatelink.italynorth.azurecontainerapps.io"
  resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
}
