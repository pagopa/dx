data "azurerm_redis_cache" "this" {
  for_each = { for cache in local.redis.caches : "${cache.cache_name}|${cache.resource_group_name}" => cache }

  name                = each.value.cache_name
  resource_group_name = each.value.resource_group_name
}

resource "azurerm_redis_cache_access_policy_assignment" "this" {
  for_each           = local.redis.assignments
  name               = "${var.principal_id}-${each.key}"
  redis_cache_id     = data.azurerm_redis_cache.this["${each.value.cache_name}|${each.value.resource_group_name}"].id
  access_policy_name = local.redis.access_policy_name[lower(each.value.role)]
  object_id          = var.principal_id
  object_id_alias    = each.value.username
}