resource "azurerm_managed_redis_access_policy_assignment" "data_owners" {
  for_each = {
    for principal_id in var.authorized_teams.data_owners : principal_id => principal_id
  }

  managed_redis_id = azurerm_managed_redis.this.id
  object_id        = each.value
}
