#------------#
# Networking #
#------------#

data "azurerm_private_dns_zone" "mysql_dns_zone" {
  name                = "privatelink.mysql.database.azure.com"
  resource_group_name = var.private_dns_zone_resource_group_name
}
