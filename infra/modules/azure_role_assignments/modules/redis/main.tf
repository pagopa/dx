resource "azurerm_redis_cache_access_policy_assignment" "this" {
  for_each           = local.assignments
  name               = "${var.principal_id}-${each.key}"
  redis_cache_id     = each.value.cache_id
  access_policy_name = local.access_policy_name[lower(each.value.role)]
  object_id          = var.principal_id
  object_id_alias    = each.value.username
}