output "resource_group" {
  description = "Details of the Resource Group, including name, ID, and location."
  value = {
    name     = azurerm_resource_group.main.name
    id       = azurerm_resource_group.main.id
    location = azurerm_resource_group.main.location
  }
}

output "storage_account" {
  description = "Details of the Storage Account, including name, ID, and primary endpoints."
  value = {
    name              = module.storage_account.name
    id                = module.storage_account.id
    primary_blob_host = module.storage_account.primary_blob_host
  }
}

output "function_app" {
  description = "Details of the Function App, including name, ID, default hostname, and identity."
  value = {
    name              = module.function_app.name
    id                = module.function_app.id
    default_hostname  = module.function_app.default_hostname
    identity          = module.function_app.identity
    principal_id      = module.function_app.identity.principal_id
  }
}

output "cosmos_db" {
  description = "Details of the Cosmos DB Account, including name, ID, endpoint, and database."
  value = {
    account_name  = azurerm_cosmosdb_account.main.name
    account_id    = azurerm_cosmosdb_account.main.id
    endpoint      = azurerm_cosmosdb_account.main.endpoint
    database_name = azurerm_cosmosdb_sql_database.main.name
    database_id   = azurerm_cosmosdb_sql_database.main.id
  }
}

output "app_service_plan" {
  description = "Details of the App Service Plan, including name and ID."
  value = {
    name = azurerm_service_plan.main.name
    id   = azurerm_service_plan.main.id
  }
}
