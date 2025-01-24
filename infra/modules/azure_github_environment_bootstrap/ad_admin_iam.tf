# subscription roles defined in `eng-azure-authorization` repo

# Resource Group
resource "azurerm_role_assignment" "admins_group_rg" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Owner"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group the complete ownership at monorepository resource group scope"
}

# Storage Account - Terraform state file
resource "azurerm_role_assignment" "admins_group_st_tf" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to apply changes to the Terraform state file Storage Account scope"
}

# Key Vault
resource "azurerm_role_assignment" "admins_group_rg_kv_data" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Data Access Administrator"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to changes to apply changes to KeyVault's data at monorepository resource group scope"
}

resource "azurerm_role_assignment" "admins_group_rg_kv_admin" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to changes to apply changes to KeyVault at monorepository resource group scope"
}
