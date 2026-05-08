output "azurerm_role_assignment" {
  value = azurerm_role_assignment.control_plane
}

output "azurerm_cosmosdb_sql_role_assignment" {
  value = azurerm_cosmosdb_sql_role_assignment.this
}
