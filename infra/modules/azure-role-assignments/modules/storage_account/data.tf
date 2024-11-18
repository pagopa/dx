data "azurerm_storage_account" "this" {
  for_each            = { for account in local.accounts : "${account.resource_group_name}|${account.storage_account_name}" => account }
  name                = each.value.storage_account_name
  resource_group_name = each.value.resource_group_name
}

data "azurerm_storage_container" "this" {
  for_each             = { for container in local.containers : "${container.storage_account_name}|${container.container_name}" => container }
  name                 = each.value.container_name
  storage_account_name = each.value.storage_account_name
}

data "azurerm_storage_table" "this" {
  for_each             = { for table in local.tables : "${table.storage_account_name}|${table.table_name}" => table }
  name                 = each.value.table_name
  storage_account_name = each.value.storage_account_name
}

data "azurerm_storage_queue" "this" {
  for_each             = { for queue in local.queues : "${queue.storage_account_name}|${queue.queue_name}" => queue }
  name                 = each.value.queue_name
  storage_account_name = each.value.storage_account_name
}