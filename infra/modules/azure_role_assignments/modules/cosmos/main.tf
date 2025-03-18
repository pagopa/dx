resource "azurerm_cosmosdb_sql_role_assignment" "this" {
  for_each = local.assignments

  resource_group_name = each.value.resource_group_name
  account_name        = each.value.account_name
  role_definition_id  = "${each.value.account_id}/sqlRoleDefinitions/${local.role_definition_id[lower(each.value.role)]}"
  principal_id        = var.principal_id
  scope               = "${each.value.account_id}${each.value.scope}"
}