resource "azurerm_cosmosdb_sql_database" "psn_01" {
  name                = "${local.project}-cosmos-01"
  resource_group_name = azurerm_cosmosdb_account.psn_01.resource_group_name
  account_name        = azurerm_cosmosdb_account.psn_01.name
}
