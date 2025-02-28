locals {
  access_policy_name = {
    reader = "Data Reader"
    writer = "Data Contributor"
    owner  = "Data Owner"
  }

  caches = distinct([for assignment in var.redis : { cache_name = assignment.cache_name, resource_group_name = assignment.resource_group_name } if assignment.cache_id == null])

  norm_caches = [for cache in var.redis : {
    cache_name          = try(provider::azurerm::parse_resource_id(cache.cache_id)["resource_name"], cache.cache_name)
    cache_id            = try(data.azurerm_redis_cache.this["${cache.resource_group_name}|${cache.cache_name}"].id, cache.cache_id)
    resource_group_name = try(provider::azurerm::parse_resource_id(cache.cache_id)["resource_group_name"], cache.resource_group_name)
    role                = cache.role
    username            = cache.username
  }]

  assignments = {
    for assignment in local.norm_caches : "${assignment.cache_name}|${assignment.resource_group_name}|${assignment.role}|${assignment.username}" => assignment
  }
}