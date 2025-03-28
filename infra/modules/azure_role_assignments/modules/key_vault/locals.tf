locals {
  norm_vaults = [
    for vault in var.key_vault :
    merge(vault, {
      name                = vault.name
      id                  = provider::azurerm::normalise_resource_id("/subscriptions/${var.subscription_id}/resourceGroups/${vault.resource_group_name}/providers/Microsoft.KeyVault/vaults/${vault.name}")
      resource_group_name = vault.resource_group_name
    })
  ]

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
