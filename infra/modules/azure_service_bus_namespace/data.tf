data "azurerm_private_dns_zone" "this" {
  count = local.use_case_features.private_enpoint ? 1 : 0

  name                = "privatelink.servicebus.windows.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}
