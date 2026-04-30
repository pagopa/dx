# Subscription
resource "azurerm_role_assignment" "infra_ci_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "DX Infra CI Subscription"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read resources and Terraform configuration at subscription scope"
}

resource "azurerm_role_assignment" "infra_ci_rgs_reader" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "DX Infra CI Resource Groups"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read resource group resources and data-plane configuration at ${each.value} resource group scope"
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
  role_definition_name = "Key Vault Crypto Officer" # Need officer to get rotation policy: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_key#example-usage
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

# API Management
resource "azurerm_role_assignment" "infra_ci_subscription_apim_secrets" {
  count = local.has_apim

  scope                = var.apim_id
  role_definition_name = "PagoPA API Management Service List Secrets"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read secrets at APIM scope"
}
