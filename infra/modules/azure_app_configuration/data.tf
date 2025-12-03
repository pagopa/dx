data "azurerm_private_dns_zone" "appconfig" {
  name                = "privatelink.azconfig.io"
  resource_group_name = local.private_dns_zone.resource_group_name
}
