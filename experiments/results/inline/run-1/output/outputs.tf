output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "ID of the resource group"
  value       = azurerm_resource_group.main.id
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = module.storage_account.name
}

output "storage_account_id" {
  description = "ID of the storage account"
  value       = module.storage_account.id
}

output "function_app_name" {
  description = "Name of the Function App"
  value       = module.function_app.name
}

output "function_app_id" {
  description = "ID of the Function App"
  value       = module.function_app.id
}

output "function_app_default_hostname" {
  description = "Default hostname of the Function App"
  value       = module.function_app.default_hostname
}

output "function_app_identity_principal_id" {
  description = "Principal ID of the Function App managed identity"
  value       = module.function_app.identity_principal_id
}

output "cosmosdb_account_name" {
  description = "Name of the Cosmos DB account"
  value       = module.cosmosdb_account.name
}

output "cosmosdb_account_id" {
  description = "ID of the Cosmos DB account"
  value       = module.cosmosdb_account.id
}

output "cosmosdb_endpoint" {
  description = "Endpoint of the Cosmos DB account"
  value       = module.cosmosdb_account.endpoint
}

output "cosmosdb_database_name" {
  description = "Name of the Cosmos DB database"
  value       = azurerm_cosmosdb_sql_database.main.name
}

output "cosmosdb_container_name" {
  description = "Name of the Cosmos DB container"
  value       = azurerm_cosmosdb_sql_container.main.name
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}
