output "name" {
  value = azurerm_cosmosdb_account.this.name
}

output "id" {
  value = azurerm_cosmosdb_account.this.id
}

output "endpoint" {
  value = azurerm_cosmosdb_account.this.endpoint
}

output "read_endpoints" {
  value = azurerm_cosmosdb_account.this.read_endpoints
}

output "write_endpoints" {
  value = azurerm_cosmosdb_account.this.write_endpoints
}