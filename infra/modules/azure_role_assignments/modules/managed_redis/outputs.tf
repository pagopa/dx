output "azurerm_managed_redis_access_policy_assignment" {
  description = "Access policy assignments created for Azure Managed Redis instances, keyed by \"{name}|{resource_group_name}\"."
  value = {
    this = azurerm_managed_redis_access_policy_assignment.this
  }
}
