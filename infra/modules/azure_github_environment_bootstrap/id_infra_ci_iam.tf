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

resource "azurerm_role_assignment" "infra_ci_rg_cosmos_contributor" {
  scope                = azurerm_resource_group.main.id
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
resource "azurerm_role_assignment" "infra_ci_rg_kv_secr" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's secrets at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_kv_cert" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Key Vault Certificate User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's certificates at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_kv_crypto" {
  scope                = azurerm_resource_group.main.id
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
resource "azurerm_role_assignment" "infra_ci_rg_st_blob_reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account blobs monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_st_queue_reader" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Storage Queue Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account queues monorepository resource group scope"
}

# DNS Zone
resource "azurerm_role_assignment" "infra_ci_rg_ext_pagopa_dns_reader" {
  scope                = var.dns_zone_resource_group_id
  role_definition_name = "PagoPA DNS Zone Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read DNS Zone records at resource group level"
}

# API Management
resource "azurerm_role_assignment" "infra_ci_subscription_apim_secrets" {
  count = local.has_apim

  scope                = var.apim_id
  role_definition_name = "PagoPA API Management Service List Secrets"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read secrets at APIM scope"
}
