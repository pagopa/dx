resource "azurerm_cosmosdb_sql_role_assignment" "this" {
  for_each = local.assignments

  resource_group_name = each.value.resource_group_name
  account_name        = each.value.account_name
  role_definition_id  = "${data.azurerm_cosmosdb_account.cosmos["${each.value.resource_group_name}|${each.value.account_name}"].id}/sqlRoleDefinitions/${local.role_definition_id[lower(each.value.role)]}"
  principal_id        = var.principal_id
  scope               = "${data.azurerm_cosmosdb_account.cosmos["${each.value.resource_group_name}|${each.value.account_name}"].id}/dbs/${each.value.database}/colls/${each.value.collection}"
}