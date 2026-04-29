output "id" {
  description = "The ID of the Azure Managed Redis instance."
  value       = azurerm_managed_redis.this.id
}

output "name" {
  description = "The name of the Azure Managed Redis instance."
  value       = azurerm_managed_redis.this.name
}

output "resource_group_name" {
  description = "The name of the resource group containing the Azure Managed Redis instance."
  value       = azurerm_managed_redis.this.resource_group_name
}

output "principal_id" {
  description = "The principal ID of the system-assigned identity of the Azure Managed Redis instance."
  value       = azurerm_managed_redis.this.identity[0].principal_id
}

output "private_endpoint_ip_address" {
  description = "The private IP address assigned to the Managed Redis private endpoint, or null when public networking is in use. The value is populated only after the private DNS zone group has provisioned a record set; on first apply it may resolve to null until the zone propagates."
  value       = try(azurerm_private_endpoint.redis[0].private_dns_zone_configs[0].record_sets[0].ip_addresses[0], null)
}

output "endpoint" {
  description = "The full endpoint (hostname:port) of the Azure Managed Redis instance."
  value       = "${azurerm_managed_redis.this.hostname}:${azurerm_managed_redis.this.default_database[0].port}"
}
