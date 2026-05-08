resource "azurerm_role_assignment" "control_plane" {
  for_each = local.control_plane_assignments

  scope                = each.value.account_id
  description          = each.value.description
  role_definition_name = local.control_plane_role_definition_name[lower(each.value.role)]
  principal_id         = var.principal_id
}

resource "azurerm_cosmosdb_sql_role_assignment" "this" {
  for_each = local.data_plane_assignments

  resource_group_name = each.value.resource_group_name
  account_name        = each.value.account_name
  role_definition_id  = "${each.value.account_id}/sqlRoleDefinitions/${local.data_plane_role_definition_id[lower(each.value.role)]}"
  principal_id        = var.principal_id
  scope               = "${each.value.account_id}${each.value.scope}"
}
