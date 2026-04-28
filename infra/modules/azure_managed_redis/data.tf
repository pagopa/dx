data "azurerm_private_dns_zone" "redis" {
  count = local.private_endpoint_enabled ? 1 : 0

  name                = "privatelink.redis.azure.net"
  resource_group_name = local.private_dns_zone_resource_group_name
}
