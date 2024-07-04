data "azurerm_storage_account" "this" {
  for_each            = { for account in local.storage_account.accounts : "${account.resource_group_name}|${account.storage_account_name}" => account }
  name                = each.value.storage_account_name
  resource_group_name = each.value.resource_group_name
}

data "azurerm_storage_container" "this" {
  for_each             = { for container in local.storage_account.containers : "${container.storage_account_name}|${container.container_name}" => container }
  name                 = each.value.container_name
  storage_account_name = each.value.storage_account_name
}

data "azurerm_storage_table" "this" {
  for_each             = { for table in local.storage_account.tables : "${table.storage_account_name}|${table.table_name}" => table }
  name                 = each.value.table_name
  storage_account_name = each.value.storage_account_name
}

data "azurerm_storage_queue" "this" {
  for_each             = { for queue in local.storage_account.queues : "${queue.storage_account_name}|${queue.queue_name}" => queue }
  name                 = each.value.queue_name
  storage_account_name = each.value.storage_account_name
}

resource "azurerm_role_assignment" "blob" {
  for_each             = local.storage_account.blob_assignments
  role_definition_name = local.storage_account.role_definition_name.blob[lower(each.value.role)]
  scope                = each.value.container_name == "*" ? data.azurerm_storage_account.this["${each.value.resource_group_name}|${each.value.storage_account_name}"].id : data.azurerm_storage_container.this[each.key].resource_manager_id
  principal_id         = var.principal_id
}

resource "azurerm_role_assignment" "table" {
  for_each             = local.storage_account.table_assignments
  role_definition_name = local.storage_account.role_definition_name.table[lower(each.value.role)]
  scope                = each.value.table_name == "*" ? data.azurerm_storage_account.this["${each.value.resource_group_name}|${each.value.storage_account_name}"].id : data.azurerm_storage_table.this[each.key].resource_manager_id
  principal_id         = var.principal_id
}

resource "azurerm_role_assignment" "queue" {
  for_each             = local.storage_account.queue_assignments
  role_definition_name = local.storage_account.role_definition_name.queue[lower(each.value.role)]
  scope                = each.value.queue_name == "*" ? data.azurerm_storage_account.this["${each.value.resource_group_name}|${each.value.storage_account_name}"].id : data.azurerm_storage_queue.this[each.key].resource_manager_id
  principal_id         = var.principal_id
}
