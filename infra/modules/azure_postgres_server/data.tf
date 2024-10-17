#------------#
# Networking #
#------------#

data "azurerm_private_dns_zone" "postgre_dns_zone" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = var.private_dns_zone_resource_group_name
}
