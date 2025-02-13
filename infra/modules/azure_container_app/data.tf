data "azurerm_key_vault" "kv" {
  count = var.key_vault != null ? 1 : 0

  name                = var.key_vault.name
  resource_group_name = var.key_vault.resource_group_name
}

data "azurerm_virtual_network" "this" {
  count = var.create_container_app_environment ? 1 : 0

  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}

data "azurerm_private_dns_zone" "this" {
  count = var.create_container_app_environment ? 1 : 0

  name                = "privatelink.azurewebsites.net"
  resource_group_name = var.private_dns_zone_resource_group_name == null ? var.virtual_network.resource_group_name : var.private_dns_zone_resource_group_name
}
