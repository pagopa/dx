output "legacy_assignments" {
  description = "The created legacy Redis cache access policy assignments"
  value       = azurerm_redis_cache_access_policy_assignment.this
}

output "managed_assignments" {
  description = "The created managed Redis access policy assignments"
  value       = azurerm_managed_redis_access_policy_assignment.this
}
