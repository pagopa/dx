resource "azurerm_cosmosdb_sql_container" "container_01" {
  name                = "container_01"
  resource_group_name = azurerm_cosmosdb_account.psn_01.resource_group_name
  account_name        = azurerm_cosmosdb_account.psn_01.name
  database_name       = azurerm_cosmosdb_sql_database.psn_01.name

  partition_key_paths = ["/id"]
}
