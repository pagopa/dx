# Subscription
resource "azurerm_role_assignment" "infra_ci_subscription_reader" {
  scope                = var.subscription_id
  role_definition_name = "PagoPA DX Infra CI Subscription Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read DX repository resources at subscription scope"
}

# Storage Account - Terraform state file
resource "azurerm_role_assignment" "infra_ci_tf_st_blob_contributor" {
  scope                = local.tf_storage_account.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to apply changes to the Terraform state file Storage Account scope"
}

# Key Vault
resource "azurerm_role_assignment" "infra_ci_rgs_reader" {
  for_each = local.resource_group_ids

  scope                = each.value
  role_definition_name = "PagoPA DX Infra CI Resource Group Reader"
  principal_id         = azurerm_user_assigned_identity.infra_ci.principal_id
  description          = "Allow ${var.repository.name} Infra CI identity to read the DX resource group bundle at ${each.value} scope"
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
