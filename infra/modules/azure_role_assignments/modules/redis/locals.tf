locals {
  access_policy_name = {
    reader = "Data Reader"
    writer = "Data Contributor"
    owner  = "Data Owner"
  }

  norm_caches = [for cache in var.redis : {
    cache_name          = cache.cache_name
    cache_id            = provider::azurerm::normalise_resource_id("/subscriptions/${var.subscription_id}/resourceGroups/${cache.resource_group_name}/providers/Microsoft.Cache/Redis/${cache.cache_name}")
    resource_group_name = cache.resource_group_name
    role                = cache.role
    username            = cache.username
  }]

  assignments = {
    for assignment in local.norm_caches : "${assignment.cache_name}|${assignment.resource_group_name}|${assignment.role}|${assignment.username}" => assignment
  }
}
