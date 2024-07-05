data "azurerm_redis_cache" "this" {
  for_each = { for cache in local.caches : "${cache.resource_group_name}|${cache.cache_name}" => cache }

  name                = each.value.cache_name
  resource_group_name = each.value.resource_group_name
}