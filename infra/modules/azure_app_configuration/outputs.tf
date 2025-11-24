output "name" {
  description = "The name of the Azure Cosmos DB account."
  value       = azurerm_app_configuration.this.name
}

output "id" {
  description = "The ID of the Azure Cosmos DB account."
  value       = azurerm_app_configuration.this.id
}

output "resource_group_name" {
  description = "The name of the resource group containing the Azure Cosmos DB account."
  value       = azurerm_app_configuration.this.resource_group_name
}

output "principal_id" {
  description = "The system-assigned managed identity pricipal id"
  value       = azurerm_app_configuration.this.identity[0].principal_id
}

output "endpoint" {
  description = "The service endpoint URL"
  value       = azurerm_app_configuration.this.endpoint
}
