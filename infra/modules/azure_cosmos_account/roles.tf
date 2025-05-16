resource "azurerm_cosmosdb_sql_role_assignment" "principal_role_assignments" {
  for_each = local.principal_role_assignments

  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.this.name
  role_definition_id  = each.value.role_definition_id
  principal_id        = each.value.principal_id

  scope = azurerm_cosmosdb_account.this.id
}