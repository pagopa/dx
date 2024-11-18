resource "azurerm_role_assignment" "blob" {
  for_each             = local.blob_assignments
  role_definition_name = local.role_definition_name.blob[lower(each.value.role)]
  scope                = each.value.container_name == "*" ? data.azurerm_storage_account.this["${each.value.resource_group_name}|${each.value.storage_account_name}"].id : data.azurerm_storage_container.this["${each.value.storage_account_name}|${each.value.container_name}"].resource_manager_id
  principal_id         = var.principal_id
}

resource "azurerm_role_assignment" "table" {
  for_each             = local.table_assignments
  role_definition_name = local.role_definition_name.table[lower(each.value.role)]
  scope                = each.value.table_name == "*" ? data.azurerm_storage_account.this["${each.value.resource_group_name}|${each.value.storage_account_name}"].id : data.azurerm_storage_table.this["${each.value.storage_account_name}|${each.value.table_name}"].resource_manager_id
  principal_id         = var.principal_id
}

resource "azurerm_role_assignment" "queue" {
  for_each             = local.queue_assignments
  role_definition_name = each.value.role_definition_name
  scope                = each.value.queue_name == "*" ? data.azurerm_storage_account.this["${each.value.resource_group_name}|${each.value.storage_account_name}"].id : data.azurerm_storage_queue.this["${each.value.storage_account_name}|${each.value.queue_name}"].resource_manager_id
  principal_id         = var.principal_id
}
