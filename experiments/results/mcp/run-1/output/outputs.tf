output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}

output "function_app_name" {
  description = "Name of the Function App"
  value       = module.function_app.function_app.name
}

output "function_app_default_hostname" {
  description = "Default hostname of the Function App"
  value       = module.function_app.function_app.default_hostname
}

output "function_app_principal_id" {
  description = "Principal ID (Managed Identity) of the Function App"
  value       = module.function_app.function_app.principal_id
}

output "storage_account_function_name" {
  description = "Name of the Function App storage account"
  value       = module.storage_account_function.name
}

output "storage_account_artifacts_name" {
  description = "Name of the artifacts storage account"
  value       = module.storage_account_artifacts.name
}

output "cosmos_db_account_name" {
  description = "Name of the Cosmos DB account"
  value       = module.cosmos_db.name
}

output "cosmos_db_endpoint" {
  description = "Endpoint of the Cosmos DB account"
  value       = module.cosmos_db.endpoint
}

output "cosmos_db_database_name" {
  description = "Name of the Cosmos DB SQL database"
  value       = azurerm_cosmosdb_sql_database.main.name
}

output "cosmos_db_container_name" {
  description = "Name of the Cosmos DB SQL container"
  value       = azurerm_cosmosdb_sql_container.items.name
}
