#------------#
# Networking #
#------------#

data "azurerm_private_dns_zone" "postgre_dns_zone" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = local.private_dns_zone.resource_group_name
}
