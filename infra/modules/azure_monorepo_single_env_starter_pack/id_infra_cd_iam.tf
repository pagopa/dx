# Subscription
resource "azurerm_role_assignment" "infra_cd_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to read resources at subscription scope"
}

# Resource Group
resource "azurerm_role_assignment" "infra_cd_rg_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to apply changes to resources at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_rbac_admin" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Role Based Access Control Administrator"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage IAM configuration at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_user_access_admin" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "User Access Administrator"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage locks at monorepository resource group scope"
}

# VNet
resource "azurerm_role_assignment" "infra_cd_vnet_network_contributor" {
  scope                = var.pep_vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage Private Endpoints at VNet scope"
}

# DNS Zone
resource "azurerm_role_assignment" "infra_cd_rg_ext_network_contributor" {
  scope                = var.dns_zone_resource_group_id
  role_definition_name = "Private DNS Zone Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage DNS Zones at resource group level"
}

# Api Management
resource "azurerm_role_assignment" "infra_cd_apim_service_contributor" {
  count = local.has_apim

  scope                = var.apim_id
  role_definition_name = "API Management Service Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to manage configuration at APIM scope"
}

# Storage Account - Terraform state file
resource "azurerm_role_assignment" "infra_cd_st_tf_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to apply changes to the Terraform state file Storage Account scope"
}

# Key Vault
resource "azurerm_role_assignment" "infra_cd_rg_kv_secr" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to changes to KeyVault's secrets at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_kv_cert" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to change KeyVault's certificates at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_kv_crypto" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to change KeyVault's keys at monorepository resource group scope"
}

resource "azurerm_key_vault_access_policy" "infra_cd_kv_common" {
  for_each = toset(var.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.infra_cd.principal_id

  secret_permissions = ["Get", "List", "Set"]
}

# Storage Account - Blob and Queue
resource "azurerm_role_assignment" "infra_cd_rg_st_blob_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account blobs monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_st_queue_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow ${var.repository.name} Infra CD identity to write Storage Account queues monorepository resource group scope"
}