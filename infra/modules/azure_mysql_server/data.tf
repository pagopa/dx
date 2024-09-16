#------------#
# Networking #
#------------#

data "azurerm_private_dns_zone" "mysql_dns_zone" {
  name                = "privatelink.mysql.database.azure.com"
  resource_group_name = local.private_dns_zone.resource_group_name
}
