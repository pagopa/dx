locals {
  access_policy_name = {
    reader = "Data Reader"
    writer = "Data Contributor"
    owner  = "Data Owner"
  }

  norm_caches = [for cache in var.redis : {
    cache_name          = cache.cache_name
    cache_id            = cache.is_managed ? "/subscriptions/${var.subscription_id}/resourceGroups/${cache.resource_group_name}/providers/Microsoft.Cache/redisEnterprise/${cache.cache_name}" : "/subscriptions/${var.subscription_id}/resourceGroups/${cache.resource_group_name}/providers/Microsoft.Cache/redis/${cache.cache_name}"
    resource_group_name = cache.resource_group_name
    role                = cache.role
    username            = cache.username
    is_managed          = cache.is_managed
  }]

  assignments_legacy = {
    for assignment in local.norm_caches : "${assignment.cache_name}|${assignment.resource_group_name}|${assignment.role}|${assignment.username}" => assignment if !assignment.is_managed
  }

  assignments_managed = {
    for assignment in local.norm_caches : "${assignment.cache_name}|${assignment.resource_group_name}|${coalesce(assignment.role, "managed")}|${coalesce(assignment.username, "")}" => assignment if assignment.is_managed
  }
}
