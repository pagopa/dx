locals {
  norm_blobs = [
    for blob in var.storage_blob : {
      storage_account_name          = provider::azurerm::parse_resource_id(blob.storage_account_id)["resource_name"]
      storage_account_id            = blob.storage_account_id
      resource_group_name           = provider::azurerm::parse_resource_id(blob.storage_account_id)["resource_group_name"]
      container_name                = blob.container_name
      container_resource_manager_id = blob.container_name != "*" ? "${blob.storage_account_id}/blobServices/default/containers/${blob.container_name}" : "*"
      role                          = blob.role
    }
  ]
  blob_assignments = { for assignment in local.norm_blobs : "${assignment.storage_account_name}|${assignment.container_name}|${assignment.role}" => assignment }


  norm_tables = [
    for table in var.storage_table : {
      storage_account_name      = provider::azurerm::parse_resource_id(table.storage_account_id)["resource_name"]
      storage_account_id        = table.storage_account_id
      resource_group_name       = provider::azurerm::parse_resource_id(table.storage_account_id)["resource_group_name"]
      table_name                = table.table_name
      table_resource_manager_id = table.table_name != "*" ? "${table.storage_account_id}/tableServices/default/tables/${table.table_name}" : "*"
      role                      = table.role
    }
  ]
  table_assignments = { for assignment in local.norm_tables : "${assignment.storage_account_name}|${assignment.table_name}|${assignment.role}" => assignment }


  norm_queues = [
    for queue in var.storage_queue : {
      storage_account_name      = provider::azurerm::parse_resource_id(queue.storage_account_id)["resource_name"]
      storage_account_id        = queue.storage_account_id
      resource_group_name       = provider::azurerm::parse_resource_id(queue.storage_account_id)["resource_group_name"]
      queue_name                = queue.queue_name
      queue_resource_manager_id = queue.queue_name != "*" ? "${queue.storage_account_id}/queueServices/default/queues/${queue.queue_name}" : "*"
      role                      = queue.role
    }
  ]
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