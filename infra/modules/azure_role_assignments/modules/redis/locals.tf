locals {
  access_policy_name = {
    reader = "Data Reader"
    writer = "Data Contributor"
    owner  = "Data Owner"
  }

  caches = distinct([for assignment in var.redis : { cache_name = assignment.cache_name, resource_group_name = assignment.resource_group_name } if assignment.cache_id == null])

  assignments = {
    for assignment in var.redis : "${assignment.cache_name}|${assignment.resource_group_name}|${assignment.role}|${assignment.username}" => assignment
  }
}