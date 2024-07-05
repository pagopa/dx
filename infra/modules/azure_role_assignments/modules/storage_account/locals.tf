locals {
  accounts = distinct(
    concat(
      [for blob in var.storage_blob : { storage_account_name = blob.storage_account_name, resource_group_name = blob.resource_group_name }],
      [for table in var.storage_table : { storage_account_name = table.storage_account_name, resource_group_name = table.resource_group_name }],
      [for queue in var.storage_queue : { storage_account_name = queue.storage_account_name, resource_group_name = queue.resource_group_name }]
    )
  )

  containers       = distinct([for blob in var.storage_blob : { storage_account_name = blob.storage_account_name, resource_group_name = blob.resource_group_name, container_name = blob.container_name } if blob.container_name != "*"])
  blob_assignments = { for assignment in var.storage_blob : "${assignment.storage_account_name}|${assignment.container_name}|${assignment.role}" => assignment }

  tables            = distinct([for table in var.storage_table : { storage_account_name = table.storage_account_name, resource_group_name = table.resource_group_name, table_name = table.table_name } if table.table_name != "*"])
  table_assignments = { for assignment in var.storage_table : "${assignment.storage_account_name}|${assignment.table_name}|${assignment.role}" => assignment }

  queues            = distinct([for queue in var.storage_queue : { storage_account_name = queue.storage_account_name, resource_group_name = queue.resource_group_name, queue_name = queue.queue_name } if queue.queue_name != "*"])
  queue_assignments = { for assignment in var.storage_queue : "${assignment.storage_account_name}|${assignment.queue_name}|${assignment.role}" => assignment }

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
      reader = "Storage Queue Data Reader",
      writer = "Storage Queue Data Contributor",
      owner  = "Storage Queue Data Contributor"
    }
  }
}