# subscription roles defined in `eng-azure-authorization` repo

resource "azurerm_role_assignment" "admins_group_rg" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Owner"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group the complete ownership at monorepository resource group scope"
}

resource "azurerm_role_assignment" "admins_group_st_tf" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to apply changes to the Terraform state file Storage Account scope"
}

resource "azurerm_role_assignment" "admins_vnet_network_contributor" {
  scope                = var.pep_vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to manage Private Endpoints at VNet scope"
}

resource "azurerm_role_assignment" "admins_apim_service_contributor" {
  scope                = var.apim_id
  role_definition_name = "API Management Service Contributor"
  principal_id         = var.entraid_groups.admins_object_id
  description          = "Allow ${var.repository.name} AD Admin group to manage configuration at APIM scope"
}

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

resource "azurerm_role_assignment" "devs_group_rg" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = var.entraid_groups.devs_object_id
  description          = "Allow ${var.repository.name} AD Dev group to apply changes at monorepository resource group scope"
}

resource "azurerm_role_assignment" "devs_group_tf_st" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = var.entraid_groups.devs_object_id
  description          = "Allow ${var.repository.name} AD Dev group to apply changes to the Terraform state file Storage Account scope"
}

resource "azurerm_role_assignment" "devs_apim_service_contributor" {
  scope                = var.apim_id
  role_definition_name = "API Management Service Contributor"
  principal_id         = var.entraid_groups.devs_object_id
  description          = "Allow ${var.repository.name} AD Dev group to manage configuration at APIM scope"
}

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

resource "azurerm_role_assignment" "externals_group_rg" {
  count = var.entraid_groups.externals_object_id == null ? 0 : 1

  scope                = azurerm_resource_group.main.id
  role_definition_name = "Reader"
  principal_id         = var.entraid_groups.externals_object_id
  description          = "Allow ${var.repository.name} AD external group to read resources at subscription scope"
}

resource "azurerm_role_assignment" "externals_group_tf_rg" {
  count = var.entraid_groups.externals_object_id == null ? 0 : 1

  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = var.entraid_groups.externals_object_id
  description          = "Allow ${var.repository.name} AD external group to read blobs at the Terraform state file Storage Account scope"
}
