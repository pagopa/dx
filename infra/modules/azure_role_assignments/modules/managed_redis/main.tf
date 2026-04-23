resource "azurerm_managed_redis_access_policy_assignment" "this" {
  for_each         = local.assignments
  managed_redis_id = each.value
  object_id        = var.principal_id
}
