resource "azurerm_cosmosdb_sql_role_assignment" "principal_role_assignments" {
  for_each = local.principal_ids_map

  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.this.name
  role_definition_id  = local.cosmos_db_data_reader_role_id
  principal_id        = each.value

  scope = azurerm_cosmosdb_account.this.id
}