output "resource_group" {
  description = "Details of the resource group created for the project."
  value = {
    name     = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
    id       = azurerm_resource_group.main.id
  }
}

output "function_app" {
  description = "Details of the Function App, including its name, ID, and default hostname."
  value = {
    name              = azurerm_linux_function_app.main.name
    id                = azurerm_linux_function_app.main.id
    default_hostname  = azurerm_linux_function_app.main.default_hostname
    principal_id      = azurerm_linux_function_app.main.identity[0].principal_id
  }
}

output "storage_account" {
  description = "Details of the Storage Account used by the Function App."
  value = {
    name                  = azurerm_storage_account.function.name
    id                    = azurerm_storage_account.function.id
    primary_blob_endpoint = azurerm_storage_account.function.primary_blob_endpoint
  }
}

output "cosmos_db" {
  description = "Details of the Cosmos DB account, including its endpoint and name."
  value = {
    name     = azurerm_cosmosdb_account.main.name
    id       = azurerm_cosmosdb_account.main.id
    endpoint = azurerm_cosmosdb_account.main.endpoint
  }
  sensitive = true
}

output "key_vault" {
  description = "Details of the Key Vault used for secrets management."
  value = {
    name = azurerm_key_vault.main.name
    id   = azurerm_key_vault.main.id
    uri  = azurerm_key_vault.main.vault_uri
  }
}

output "application_insights" {
  description = "Details of Application Insights for monitoring the Function App."
  value = {
    name                 = azurerm_application_insights.main.name
    id                   = azurerm_application_insights.main.id
    instrumentation_key  = azurerm_application_insights.main.instrumentation_key
    connection_string    = azurerm_application_insights.main.connection_string
  }
  sensitive = true
}
