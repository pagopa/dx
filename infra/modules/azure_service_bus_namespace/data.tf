data "azurerm_private_dns_zone" "this" {
  count = local.sku_name == "Premium" ? 1 : 0

  name                = "privatelink.servicebus.windows.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}
