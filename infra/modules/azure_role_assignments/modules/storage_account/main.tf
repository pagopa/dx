resource "azurerm_role_assignment" "blob" {
  for_each             = local.blob_assignments
  role_definition_name = local.role_definition_name.blob[lower(each.value.role)]
  scope                = each.value.container_name == "*" ? each.value.storage_account_id : each.value.cnt_res_mng_id
  principal_id         = var.principal_id
  description          = each.value.description
}

resource "azurerm_role_assignment" "table" {
  for_each             = local.table_assignments
  role_definition_name = local.role_definition_name.table[lower(each.value.role)]
  scope                = each.value.table_name == "*" ? each.value.storage_account_id : each.value.tbl_res_mng_id
  principal_id         = var.principal_id
  description          = each.value.description
}

resource "azurerm_role_assignment" "queue" {
  for_each             = local.queue_assignments
  role_definition_name = each.value.role_definition_name
  scope                = each.value.queue_name == "*" ? each.value.storage_account_id : each.value.queue_res_mng_id
  principal_id         = var.principal_id
  description          = each.value.description
}
