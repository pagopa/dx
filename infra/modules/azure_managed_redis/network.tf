resource "azurerm_private_endpoint" "redis" {
  count = local.private_endpoint_enabled ? 1 : 0

  name                = local.private_endpoint_name
  location            = var.environment.location
  resource_group_name = var.resource_group_name
  subnet_id           = local.subnet_pep_id

  private_service_connection {
    name                           = local.private_endpoint_name
    private_connection_resource_id = azurerm_managed_redis.this.id
    is_manual_connection           = false
    subresource_names              = ["redisEnterprise"]
  }

  private_dns_zone_group {
    name                 = "private-dns-zone-group"
    private_dns_zone_ids = [data.azurerm_private_dns_zone.redis[0].id]
  }

  tags = local.tags
}
