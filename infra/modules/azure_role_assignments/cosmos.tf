data "azurerm_cosmosdb_account" "cosmos" {
  for_each = { for account in local.cosmos.accounts : "${account.resource_group_name}|${account.account_name}" => account }

  name                = each.value.account_name
  resource_group_name = each.value.resource_group_name
}


resource "azurerm_cosmosdb_sql_role_assignment" "this" {
  for_each = local.cosmos.assignments

  resource_group_name = each.value.resource_group_name
  account_name        = each.value.account_name
  role_definition_id  = "${data.azurerm_cosmosdb_account.cosmos["${each.value.resource_group_name}|${each.value.account_name}"].id}/sqlRoleDefinitions/${local.cosmos.role_definition_id[lower(each.value.role)]}"
  principal_id        = var.principal_id
  scope               = "${data.azurerm_cosmosdb_account.cosmos["${each.value.resource_group_name}|${each.value.account_name}"].id}/dbs/${each.value.database}/colls/${each.value.collection}"
}