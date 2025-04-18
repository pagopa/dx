output "id" {
  value       = azurerm_service_plan.this.id
  description = "The ID of the App Service Plan."
}

output "name" {
  value       = azurerm_service_plan.this.name
  description = "The name of the App Service Plan."
}

output "resource_group_name" {
  value       = azurerm_service_plan.this.resource_group_name
  description = "The name of the resource group where the App Service Plan is located."
}

output "sku_name" {
  value       = azurerm_service_plan.this.sku_name
  description = "The SKU name of the App Service Plan."
}

output "zone_balancing_enabled" {
  value       = azurerm_service_plan.this.zone_balancing_enabled
  description = "Indicates whether zone redundancy is enabled for the App Service Plan."
}
