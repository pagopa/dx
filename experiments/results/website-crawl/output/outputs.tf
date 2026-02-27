output "resource_group" {
  description = "Resource group details"
  value = {
    name = azurerm_resource_group.this.name
    id   = azurerm_resource_group.this.id
  }
}

output "storage_account" {
  description = "Storage account details"
  value = {
    name = azurerm_storage_account.this.name
    id   = azurerm_storage_account.this.id
  }
}

output "cosmosdb" {
  description = "Cosmos DB account details"
  value = {
    name = azurerm_cosmosdb_account.this.name
    id   = azurerm_cosmosdb_account.this.id
  }
}

output "function_app" {
  description = "Function App details"
  value = {
    name = azurerm_function_app.this.name
    id   = azurerm_function_app.this.id
    identity_principal_id = azurerm_function_app.this.identity[0].principal_id
  }
}
