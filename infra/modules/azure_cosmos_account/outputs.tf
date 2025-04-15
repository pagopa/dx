output "name" {
  description = "The name of the Azure Cosmos DB account."
  value       = azurerm_cosmosdb_account.this.name
}

output "id" {
  description = "The ID of the Azure Cosmos DB account."
  value       = azurerm_cosmosdb_account.this.id
}

output "resource_group_name" {
  description = "The name of the resource group containing the Azure Cosmos DB account."
  value       = azurerm_cosmosdb_account.this.resource_group_name
}

output "endpoint" {
  description = "The primary endpoint URL of the Azure Cosmos DB account."
  value       = azurerm_cosmosdb_account.this.endpoint
}

output "read_endpoints" {
  description = "A list of read endpoints for the Azure Cosmos DB account."
  value       = azurerm_cosmosdb_account.this.read_endpoints
}

output "write_endpoints" {
  description = "A list of write endpoints for the Azure Cosmos DB account."
  value       = azurerm_cosmosdb_account.this.write_endpoints
}