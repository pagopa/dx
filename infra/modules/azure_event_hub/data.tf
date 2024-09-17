#------------#
# Networking #
#------------#
# data "azurerm_virtual_network" "this" {
#   name                = var.virtual_network.name
#   resource_group_name = var.virtual_network.resource_group_name
# }

data "azurerm_private_dns_zone" "this" {
  name                = "privatelink.servicebus.windows.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}