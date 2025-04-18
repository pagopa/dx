output "id" {
  description = "The resource ID of the Azure API Management instance."
  value       = azurerm_api_management.this.id
}

output "name" {
  description = "The name of the Azure API Management instance."
  value       = azurerm_api_management.this.name
}

output "resource_group_name" {
  description = "The name of the resource group where the Azure API Management instance is deployed."
  value       = var.resource_group_name
}

output "private_ip_addresses" {
  description = "The private IP addresses assigned to the Azure API Management instance."
  value       = azurerm_api_management.this.private_ip_addresses
}

output "public_ip_addresses" {
  description = "The public IP addresses assigned to the Azure API Management instance."
  value       = azurerm_api_management.this.public_ip_addresses
}

output "gateway_url" {
  description = "The URL of the Azure API Management gateway."
  value       = azurerm_api_management.this.gateway_url
}

output "gateway_hostname" {
  description = "The hostname of the Azure API Management gateway."
  value       = regex("https?://([\\d\\w\\-\\.]+)", azurerm_api_management.this.gateway_url)[0]
}

output "principal_id" {
  description = "The principal ID of the Azure API Management instance, used for role assignments."
  value       = azurerm_api_management.this.identity[0].principal_id
}

output "logger_id" {
  description = "The ID of the Application Insights logger associated with the Azure API Management instance (null if Application Insights is disabled)."
  value       = var.application_insights.enabled ? azurerm_api_management_logger.this[0].id : null
}