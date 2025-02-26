locals {
  accounts = distinct(
    concat(
      [for blob in var.storage_blob : { storage_account_name = blob.storage_account_name, resource_group_name = blob.resource_group_name } if blob.storage_account_id == null],
      [for table in var.storage_table : { storage_account_name = table.storage_account_name, resource_group_name = table.resource_group_name } if table.storage_account_id == null],
      [for queue in var.storage_queue : { storage_account_name = queue.storage_account_name, resource_group_name = queue.resource_group_name } if queue.storage_account_id == null]
    )
  )

  norm_blobs = [
    for blob in var.storage_blob : {
      storage_account_name          = try(provider::azurerm::parse_resource_id(blob.storage_account_id)["resource_name"], blob.storage_account_name)
      storage_account_id            = try(data.azurerm_storage_account.this["${blob.resource_group_name}|${blob.storage_account_name}"].id, blob.storage_account_id)
      resource_group_name           = try(provider::azurerm::parse_resource_id(blob.storage_account_id)["resource_group_name"], blob.resouece_group_name)
      container_name                = blob.container_name
      container_resource_manager_id = blob.container_name != "*" ? try(data.azurerm_storage_container.this["${blob.storage_account_name}|${blob.container_name}"].resource_manager_id, blob.container_resource_manager_id) : "*"
      role                          = blob.role
    }
  ]
  containers       = distinct([for blob in var.storage_blob : { storage_account_name = blob.storage_account_name, resource_group_name = blob.resource_group_name, container_name = blob.container_name } if blob.container_name != "*" && blob.container_resource_manager_id == null])
  blob_assignments = { for assignment in local.norm_blobs : "${assignment.storage_account_name}|${assignment.container_name}|${assignment.role}" => assignment }


  norm_tables = [
    for table in var.storage_table : {
      storage_account_name      = try(provider::azurerm::parse_resource_id(table.storage_account_id)["resource_name"], table.storage_account_name)
      storage_account_id        = try(data.azurerm_storage_account.this["${table.resource_group_name}|${table.storage_account_name}"].id, table.storage_account_id)
      resource_group_name       = try(provider::azurerm::parse_resource_id(table.storage_account_id)["resource_group_name"], table.resource_group_name)
      table_name                = table.table_name
      table_resource_manager_id = table.table_name != "*" ? try(data.azurerm_storage_table.this["${table.storage_account_name}|${table.table_name}"].resource_manager_id, table.table_resource_manager_id) : "*"
      role                      = table.role
    }
  ]
  tables            = distinct([for table in var.storage_table : { storage_account_name = table.storage_account_name, resource_group_name = table.resource_group_name, table_name = table.table_name } if table.table_name != "*" && table.table_resource_manager_id == null])
  table_assignments = { for assignment in local.norm_tables : "${assignment.storage_account_name}|${assignment.table_name}|${assignment.role}" => assignment }


  norm_queues = [
    for queue in var.storage_queue : {
      storage_account_name      = try(provider::azurerm::parse_resource_id(queue.storage_account_id)["resource_name"], queue.storage_account_name)
      storage_account_id        = try(data.azurerm_storage_account.this["${queue.resource_group_name}|${queue.storage_account_name}"].id, queue.storage_account_id)
      resource_group_name       = try(provider::azurerm::parse_resource_id(queue.storage_account_id)["resource_group_name"], queue.resouece_group_name)
      queue_name                = queue.queue_name
      queue_resource_manager_id = queue.queue_name != "*" ? try(data.azurerm_storage_queue.this["${queue.storage_account_name}|${queue.queue_name}"].resource_manager_id, queue.queue_resource_manager_id) : "*"
      role                      = queue.role
    }
  ]
  queues            = distinct([for queue in var.storage_queue : { storage_account_name = queue.storage_account_name, resource_group_name = queue.resource_group_name, queue_name = queue.queue_name } if queue.queue_name != "*" && queue.queue_resource_manager_id == null])
  queue_assignments = merge([for key, item in local.norm_queues : { for role_name in local.role_definition_name.queue[lower(item.role)] : "${item.storage_account_name}|${item.queue_name}|${item.role}|${role_name}" => merge(item, { role_definition_name = role_name }) }]...)

  role_definition_name = {
    blob = {
      reader = "Storage Blob Data Reader",
      writer = "Storage Blob Data Contributor",
      owner  = "Storage Blob Data Owner"
    }

    table = {
      reader = "Storage Table Data Reader",
      writer = "Storage Table Data Contributor",
      owner  = "Storage Table Data Contributor"
    }

    queue = {
      reader = ["Storage Queue Data Message Processor", "Storage Queue Data Reader"],
      writer = ["Storage Queue Data Message Sender"],
      owner  = ["Storage Queue Data Contributor"]
    }
  }
}