output "id" {
  value       = azurerm_service_plan.this.id
  description = "Id of the App Service Plan"
}

output "name" {
  value       = azurerm_service_plan.this.name
  description = "Name of the App Service Plan"
}

output "resource_group_name" {
  value       = azurerm_service_plan.this.resource_group_name
  description = "Resource group name of the App Service Plan"
}

output "sku_name" {
  value       = azurerm_service_plan.this.sku_name
  description = "SKU name of the App Service Plan"
}

output "zone_balancing_enabled" {
  value       = azurerm_service_plan.this.zone_balancing_enabled
  description = "True whether the zone redundancy is enabled"
}
