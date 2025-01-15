# Resource Group
resource "azurerm_role_assignment" "devs_group_rg" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = var.entraid_groups.devs_object_id
  description          = "Allow ${var.repository.name} AD Dev group to apply changes at monorepository resource group scope"
}

# Storage Account - Terraform state file
resource "azurerm_role_assignment" "devs_group_tf_st" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.entraid_groups.devs_object_id
  description          = "Allow ${var.repository.name} AD Dev group to apply changes to the Terraform state file Storage Account scope"
}

# Key Vault
resource "azurerm_role_assignment" "devs_group_tf_rg_kv_secr" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = var.entraid_groups.devs_object_id
  description          = "Allow ${var.repository.name} AD Dev group to changes to KeyVault's secrets at monorepository resource group scope"
}

resource "azurerm_role_assignment" "devs_group_tf_rg_kv_cert" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = var.entraid_groups.devs_object_id
  description          = "Allow ${var.repository.name} AD Dev group to change KeyVault's certificates at monorepository resource group scope"
}
