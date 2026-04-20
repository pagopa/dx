resource "azurerm_managed_redis_geo_replication" "this" {
  count = local.geo_replication_enabled && length(var.geo_replication.linked_managed_redis_ids) > 0 ? 1 : 0

  managed_redis_id = azurerm_managed_redis.this.id

  linked_managed_redis_ids = var.geo_replication.linked_managed_redis_ids
}
