output "resource_group" {
  description = "Resource Group details"
  value = {
    id       = azurerm_resource_group.rg.id
    name     = azurerm_resource_group.rg.name
    location = azurerm_resource_group.rg.location
  }
}

output "function_app" {
  description = "Function App details"
  value = {
    id               = module.function_app.function_app.id
    name             = module.function_app.function_app.name
    default_hostname = module.function_app.function_app.default_hostname
    principal_id     = module.function_app.function_app.principal_id
  }
}

output "storage_account" {
  description = "Storage Account details"
  value = {
    id                = module.storage_account.id
    name              = module.storage_account.name
    primary_blob_host = module.storage_account.primary_blob_host
  }
}

output "cosmos_db" {
  description = "Cosmos DB Account details"
  value = {
    id       = module.cosmos_db.id
    name     = module.cosmos_db.name
    endpoint = module.cosmos_db.endpoint
  }
  sensitive = true
}

output "cosmos_database" {
  description = "Cosmos DB Database details"
  value = {
    id   = azurerm_cosmosdb_sql_database.db.id
    name = azurerm_cosmosdb_sql_database.db.name
  }
}

output "cosmos_container" {
  description = "Cosmos DB Container details"
  value = {
    id   = azurerm_cosmosdb_sql_container.items.id
    name = azurerm_cosmosdb_sql_container.items.name
  }
}
