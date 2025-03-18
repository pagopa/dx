locals {
  access_policy_name = {
    reader = "Data Reader"
    writer = "Data Contributor"
    owner  = "Data Owner"
  }

  norm_caches = [for cache in var.redis : {
    cache_name          = provider::azurerm::parse_resource_id(cache.cache_id)["resource_name"]
    cache_id            = cache.cache_id
    resource_group_name = provider::azurerm::parse_resource_id(cache.cache_id)["resource_group_name"]
    role                = cache.role
    username            = cache.username
  }]

  assignments = {
    for assignment in local.norm_caches : "${assignment.cache_name}|${assignment.resource_group_name}|${assignment.role}|${assignment.username}" => assignment
  }
}