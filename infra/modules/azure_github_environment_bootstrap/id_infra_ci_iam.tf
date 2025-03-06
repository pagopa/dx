# Subscription
resource "azurerm_role_assignment" "infra_ci_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read resources at subscription scope"
}

resource "azurerm_role_assignment" "infra_ci_subscription_data_access" {
  scope                = var.subscription_id
  role_definition_name = "Reader and Data Access"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read resources' keys and data at subscription scope"
}

resource "azurerm_role_assignment" "infra_ci_subscription_pagopa_iac_reader" {
  scope                = var.subscription_id
  role_definition_name = "PagoPA IaC Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read resources configuration at subscription scope"
}

resource "azurerm_role_assignment" "infra_ci_rgs_cosmos_contributor" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "DocumentDB Account Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read Cosmos DB configuration at resource group scope"
}

# Storage Account - Terraform state file
resource "azurerm_role_assignment" "infra_ci_tf_st_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to apply changes to the Terraform state file Storage Account scope"
}

# Key Vault
resource "azurerm_role_assignment" "infra_ci_rgs_kv_secr" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's secrets at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rgs_kv_cert" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Key Vault Certificate User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's certificates at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rgs_kv_crypto" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Key Vault Crypto User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's keys at monorepository resource group scope"
}

resource "azurerm_key_vault_access_policy" "infra_ci_kv_common" {
  for_each = toset(var.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.infra_ci.principal_id

  secret_permissions = ["Get", "List"]
}

# Storage Account - Blob and Queue
resource "azurerm_role_assignment" "infra_ci_rgs_st_blob_reader" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account blobs monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rgs_st_queue_reader" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Storage Queue Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account queues monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rgs_st_table_reader" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "Storage Table Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account tables monorepository resource group scope"
}

# API Management
resource "azurerm_role_assignment" "infra_ci_subscription_apim_secrets" {
  count = local.has_apim

  scope                = var.apim_id
  role_definition_name = "PagoPA API Management Service List Secrets"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read secrets at APIM scope"
}
