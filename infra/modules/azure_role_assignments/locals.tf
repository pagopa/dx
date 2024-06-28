locals {
  cosmos = {
    role_definition_id = {
      reader = "00000000-0000-0000-0000-000000000001"
      writer = "00000000-0000-0000-0000-000000000002"
    },
    assignments = {
      for assignment in flatten([
        for entry in var.cosmos : [
          for collection in entry.collections : {
            account_name        = entry.account_name
            resource_group_name = entry.resource_group_name
            role                = entry.role
            database            = entry.database
            collection          = collection
          }
        ]
      ]) : "${assignment.account_name}|${assignment.database}|${assignment.collection}|${assignment.role}" => assignment
    },
    accounts = distinct([for assignment in var.cosmos : { account_name = assignment.account_name, resource_group_name = assignment.resource_group_name }])
  }

  redis = {
    access_policy_name = {
      reader = "Data Reader"
      writer = "Data Contributor"
      owner  = "Data Owner"
    }

    caches = distinct([for assignment in var.redis : { cache_name = assignment.cache_name, resource_group_name = assignment.resource_group_name }])

    assignments = {
      for assignment in var.redis : "${assignment.cache_name}-${assignment.resource_group_name}-${assignment.role}" => assignment
    }
  }

  key_vault = {
    vaults = distinct([for assignment in var.key_vault : { name = assignment.name, resource_group_name = assignment.resource_group_name }])

    permissions = {
      secrets = {
        reader = ["Get", "List"]
        writer = ["Get", "List", "Set", "Delete"]
        owner  = ["Backup", "Delete", "Get", "List", "Purge", "Recover", "Restore", "Set"]
      },
      keys = {
        reader = ["Get", "List", "Encrypt", "Decrypt"]
        writer = ["Get", "List", "Update", "Create", "Import", "Delete", "Encrypt", "Decrypt"]
        owner  = ["Get", "List", "Update", "Create", "Import", "Delete", "Encrypt", "Decrypt", "Backup", "Purge", "Recover", "Restore", "Sign", "UnwrapKey", "Update", "Verify", "WrapKey", "Release", "Rotate", "GetRotationPolicy", "SetRotationPolicy"]
      },
      certificates = {
        reader = ["Get", "List", "GetIssuers", "ListIssuers"]
        writer = ["Get", "List", "GetIssuers", "ListIssuers", "Create", "Update", "SetIssuers", "Import"]
        owner  = ["Backup", "Create", "Delete", "DeleteIssuers", "Get", "GetIssuers", "Import", "List", "ListIssuers", "ManageContacts", "ManageIssuers", "Purge", "Recover", "Restore", "SetIssuers", "Update"]
      }
    }

    permissions_rbac = {
      secrets = {
        reader = "Key Vault Secrets User"
        writer = "Key Vault Secrets Officer"
        owner  = "Key Vault Secrets Officer"
      },
      keys = {
        reader = "Key Vault Crypto User"
        writer = "Key Vault Crypto Officer"
        owner  = "Key Vault Crypto Officer"
      },
      certificates = {
        reader = "Key Vault Certificate User"
        writer = "Key Vault Certificates Officer"
        owner  = "Key Vault Certificates Officer"
      }
    }
  }

  storage_account = {
    accounts = distinct(
      concat(
        [for blob in var.storage_blob : { storage_account_name = blob.storage_account_name, resource_group_name = blob.resource_group_name }],
        [for table in var.storage_table : { storage_account_name = table.storage_account_name, resource_group_name = table.resource_group_name }],
        [for queue in var.storage_queue : { storage_account_name = queue.storage_account_name, resource_group_name = queue.resource_group_name }]
      )
    )

    containers       = distinct([for blob in var.storage_blob : { storage_account_name = blob.storage_account_name, resource_group_name = blob.resource_group_name, container_name = blob.container_name } if blob.container_name != "*"])
    blob_assignments = { for assignment in var.storage_blob : "${assignment.storage_account_name}|${assignment.container_name}" => assignment }

    tables            = distinct([for table in var.storage_table : { storage_account_name = table.storage_account_name, resource_group_name = table.resource_group_name, table_name = table.table_name } if table.table_name != "*"])
    table_assignments = { for assignment in var.storage_table : "${assignment.storage_account_name}|${assignment.table_name}" => assignment }

    queues            = distinct([for queue in var.storage_queue : { storage_account_name = queue.storage_account_name, resource_group_name = queue.resource_group_name, queue_name = queue.queue_name } if queue.queue_name != "*"])
    queue_assignments = { for assignment in var.storage_queue : "${assignment.storage_account_name}|${assignment.queue_name}" => assignment }

    role_definition_name = {
      blob = {
        "reader" = "Storage Blob Data Reader",
        "writer" = "Storage Blob Data Contributor",
        "owner"  = "Storage Blob Data Owner"
      }

      table = {
        "reader" = "Storage Table Data Reader",
        "writer" = "Storage Table Data Contributor",
        "owner"  = "Storage Table Data Contributor"
      }

      queue = {
        "reader" = "Storage Queue Data Reader",
        "writer" = "Storage Queue Data Contributor",
        "owner"  = "Storage Queue Data Contributor"
      }
    }
  }
}
