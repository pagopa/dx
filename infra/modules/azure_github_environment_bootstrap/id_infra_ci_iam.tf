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

resource "azurerm_role_assignment" "infra_ci_subscription_cosmos_contributor" {
  scope                = var.subscription_id
  role_definition_name = "DocumentDB Account Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CI identity to read Cosmos DB configuration at managed resource group scopes"
}

# Storage Account - Terraform state file
resource "azurerm_role_assignment" "infra_ci_tf_st_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to apply changes to the Terraform state file Storage Account scope"
}

# Key Vault roles at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "infra_ci_subscription_kv_secr" {
  scope                = var.subscription_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's secrets at managed resource group scopes"
}

resource "azurerm_role_assignment" "infra_ci_subscription_kv_cert" {
  scope                = var.subscription_id
  role_definition_name = "Key Vault Certificate User"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's certificates at managed resource group scopes"
}

resource "azurerm_role_assignment" "infra_ci_subscription_kv_crypto" {
  scope                = var.subscription_id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CI identity to read KeyVault's keys at managed resource group scopes"
}

resource "azurerm_key_vault_access_policy" "infra_ci_kv_common" {
  for_each = toset(var.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = var.tenant_id
  object_id    = azurerm_user_assigned_identity.infra_ci.principal_id

  secret_permissions = ["Get", "List"]
}

# Storage Account - Blob and Queue roles at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "infra_ci_subscription_st_blob_reader" {
  scope                = var.subscription_id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account blobs at managed resource group scopes"
}

resource "azurerm_role_assignment" "infra_ci_subscription_st_queue_reader" {
  scope                = var.subscription_id
  role_definition_name = "Storage Queue Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account queues at managed resource group scopes"
}

resource "azurerm_role_assignment" "infra_ci_subscription_st_table_reader" {
  scope                = var.subscription_id
  role_definition_name = "Storage Table Data Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CI identity to read Storage Account tables at managed resource group scopes"
}

# Container App role at subscription level with ABAC condition for managed resource groups
resource "azurerm_role_assignment" "infra_ci_subscription_ca_operator" {
  scope                = var.subscription_id
  role_definition_name = "Container Apps Operator"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  condition            = local.condition_for_managed_resource_groups
  condition_version    = "2.0"
  description          = "Allow ${var.repository.name} Infra CI identity to read Container App configuration at managed resource group scopes"
}
