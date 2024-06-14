locals {
  cosmos = {
    role_definition_id = {
      reader = "00000000-0000-0000-0000-000000000001"
      writer = "00000000-0000-0000-0000-000000000002"
    },
    assignments = {
      for assignment in var.cosmos : "${assignment.account_name}|${assignment.database}|${assignment.collection}|${assignment.role}" => assignment
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
}
