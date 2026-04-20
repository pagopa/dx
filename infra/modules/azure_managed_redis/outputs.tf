output "name" {
  description = "The name of the Azure Managed Redis instance."
  value       = azurerm_managed_redis.this.name
}

output "id" {
  description = "The ID of the Azure Managed Redis instance."
  value       = azurerm_managed_redis.this.id
}

output "resource_group_name" {
  description = "The name of the resource group containing the Azure Managed Redis instance."
  value       = azurerm_managed_redis.this.resource_group_name
}

output "hostname" {
  description = "The hostname of the Azure Managed Redis instance."
  value       = azurerm_managed_redis.this.hostname
}

output "port" {
  description = "The default database port of the Azure Managed Redis instance."
  value       = azurerm_managed_redis.this.default_database[0].port
}

output "private_endpoint_ip_address" {
  description = "The private IP address assigned to the Managed Redis private endpoint."
  value       = try(azurerm_private_endpoint.redis[0].private_dns_zone_configs[0].record_sets[0].ip_addresses[0], null)
}

output "diagnostic_settings" {
  description = "Details of the diagnostic settings configured for the Azure Managed Redis instance."
  value = {
    id = try(azurerm_monitor_diagnostic_setting.this[0].id, null)
  }
}

output "data_owner_object_ids" {
  description = "The principal IDs granted Managed Redis data owner access."
  value       = keys(azurerm_managed_redis_access_policy_assignment.data_owners)
}
