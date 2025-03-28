locals {
  norm_blobs = [
    for blob in var.storage_blob : {
      storage_account_name          = blob.storage_account_name
      storage_account_id            = provider::azurerm::normalise_resource_id("/subscriptions/${var.subscription_id}/resourceGroups/${blob.resource_group_name}/providers/Microsoft.Storage/storageAccounts/${blob.storage_account_name}")
      resource_group_name           = blob.resource_group_name
      container_name                = blob.container_name
      container_resource_manager_id = blob.container_name != "*" ? "${blob.storage_account_id}/blobServices/default/containers/${blob.container_name}" : "*"
      role                          = blob.role
      description                   = blob.description
    }
  ]
  blob_assignments = { for assignment in local.norm_blobs : "${assignment.storage_account_name}|${assignment.container_name}|${assignment.role}" => assignment }


  norm_tables = [
    for table in var.storage_table : {
      storage_account_name      = table.storage_account_name
      storage_account_id        = provider::azurerm::normalise_resource_id("/subscriptions/${var.subscription_id}/resourceGroups/${table.resource_group_name}/providers/Microsoft.Storage/storageAccounts/${table.storage_account_name}")
      resource_group_name       = table.resource_group_name
      table_name                = table.table_name
      table_resource_manager_id = table.table_name != "*" ? "${table.storage_account_id}/tableServices/default/tables/${table.table_name}" : "*"
      role                      = table.role
      description               = table.description
    }
  ]
  table_assignments = { for assignment in local.norm_tables : "${assignment.storage_account_name}|${assignment.table_name}|${assignment.role}" => assignment }


  norm_queues = [
    for queue in var.storage_queue : {
      storage_account_name      = queue.storage_account_name
      storage_account_id        = provider::azurerm::normalise_resource_id("/subscriptions/${var.subscription_id}/resourceGroups/${queue.resource_group_name}/providers/Microsoft.Storage/storageAccounts/${queue.storage_account_name}")
      resource_group_name       = queue.resource_group_name
      queue_name                = queue.queue_name
      queue_resource_manager_id = queue.queue_name != "*" ? "${queue.storage_account_id}/queueServices/default/queues/${queue.queue_name}" : "*"
      role                      = queue.role
      description               = queue.description
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
