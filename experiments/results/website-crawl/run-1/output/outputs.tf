output "resource_group" {
  description = "Details of the resource group."
  value = {
    name     = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
    id       = azurerm_resource_group.main.id
  }
}

output "function_app" {
  description = "Details of the Function App."
  value = {
    name              = module.function_app.function_app.name
    id                = module.function_app.function_app.id
    principal_id      = module.function_app.function_app.principal_id
    default_hostname  = module.function_app.function_app.default_hostname
    resource_group    = module.function_app.function_app.resource_group_name
  }
}

output "storage_account" {
  description = "Details of the Storage Account."
  value = {
    name = module.storage_account.storage_account.name
    id   = module.storage_account.storage_account.id
  }
}

output "cosmos_db" {
  description = "Details of the Cosmos DB account."
  value = {
    name           = module.cosmos_db.name
    id             = module.cosmos_db.id
    endpoint       = module.cosmos_db.endpoint
    database_name  = azurerm_cosmosdb_sql_database.main.name
    container_name = azurerm_cosmosdb_sql_container.items.name
  }
}
