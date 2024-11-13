# tfsec:ignore:azure-keyvault-ensure-key-expiry
resource "azurerm_key_vault_key" "key" {
  for_each     = (local.cmk_flags.kv && var.customer_managed_key.key_name == null ? toset(["kv"]) : toset([]))
  name         = "${replace("${module.naming_convention.prefix}-st-${module.naming_convention.suffix}", "-", "")}-cmk-kv"
  key_vault_id = var.customer_managed_key.key_vault_id
  key_type     = "RSA"
  key_size     = 4096
  key_opts     = ["decrypt", "encrypt", "sign", "unwrapKey", "verify", "wrapKey"]

  depends_on = [
    azurerm_key_vault_access_policy.keys
  ]
}

resource "azurerm_key_vault_access_policy" "keys" {
  for_each     = (local.cmk_flags.kv && try(local.cmk_info.kv.same_subscription, false) && data.azurerm_key_vault.this["kv"].enable_rbac_authorization == false ? toset(["kv"]) : toset([]))
  key_vault_id = var.customer_managed_key.key_vault_id
  tenant_id    = data.azurerm_subscription.current.tenant_id
  object_id    = local.cmk_info.kv.principal_id

  key_permissions    = ["Get", "Create", "List", "Restore", "Recover", "UnwrapKey", "WrapKey", "Purge", "Encrypt", "Decrypt", "Sign", "Verify"]
  secret_permissions = ["Get"]
}

resource "azurerm_role_assignment" "keys" {
  for_each             = (local.cmk_flags.kv && try(local.cmk_info.kv.same_subscription, false) && data.azurerm_key_vault.this["kv"].enable_rbac_authorization == true ? toset(["kv"]) : toset([]))
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