# Create a CMK key vault key if a key is not provided
# tfsec:ignore:azure-keyvault-ensure-key-expiry
resource "azurerm_key_vault_key" "key" {
  for_each     = (local.cmk_flags.kv && var.customer_managed_key.key_name == null ? toset(["kv"]) : toset([]))
  name         = provider::dx::resource_name(merge(local.naming_config, { resource_type = "customer_key_storage_account" }))
  key_vault_id = var.customer_managed_key.key_vault_id
  key_type     = "RSA"
  key_size     = 4096
  key_opts     = ["decrypt", "encrypt", "sign", "unwrapKey", "verify", "wrapKey"]

  depends_on = [
    azurerm_key_vault_access_policy.keys
  ]
}

# Add key vault access policy if it's the supported IAM mean and the key is in the same tenant
resource "azurerm_key_vault_access_policy" "keys" {
  for_each     = (local.cmk_flags.kv && try(local.cmk_info.kv.same_subscription, false) && try(data.azurerm_key_vault.this["kv"].enable_rbac_authorization, false) == false ? toset(["kv"]) : toset([]))
  key_vault_id = var.customer_managed_key.key_vault_id
  tenant_id    = data.azurerm_subscription.current.tenant_id
  object_id    = local.cmk_info.kv.principal_id

  key_permissions    = ["Get", "Create", "List", "Restore", "Recover", "UnwrapKey", "WrapKey", "Purge", "Encrypt", "Decrypt", "Sign", "Verify"]
  secret_permissions = ["Get"]
}

# Add role assignment if it's the supported IAM mean and the key is in the same tenant
resource "azurerm_role_assignment" "keys" {
  for_each             = (local.cmk_flags.kv && try(local.cmk_info.kv.same_subscription, false) && try(data.azurerm_key_vault.this["kv"].enable_rbac_authorization, false) == true ? toset(["kv"]) : toset([]))
  scope                = var.customer_managed_key.key_vault_id
  role_definition_name = "Key Vault Crypto Service Encryption User"
  principal_id         = local.cmk_info.kv.principal_id
}

resource "azurerm_storage_account_customer_managed_key" "kv" {
  for_each                  = (local.cmk_flags.kv ? toset(["kv"]) : toset([]))
  storage_account_id        = azurerm_storage_account.this.id
  key_vault_id              = var.customer_managed_key.key_vault_id
  key_name                  = var.customer_managed_key.key_name == null ? azurerm_key_vault_key.key["kv"].name : var.customer_managed_key.key_name
  user_assigned_identity_id = var.customer_managed_key.user_assigned_identity_id
}