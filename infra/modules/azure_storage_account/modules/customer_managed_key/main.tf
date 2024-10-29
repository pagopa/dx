resource "azurerm_storage_account_customer_managed_key" "kv" {
  for_each                  = (var.customer_managed_key.enabled && var.customer_managed_key.type == "kv" ? {type = var.customer_managed_key.type} : {})
  storage_account_id        = var.storage_account_id
  key_vault_id              = var.customer_managed_key.key_vault_key_id
  key_name                  = var.customer_managed_key.key_name
  user_assigned_identity_id = var.customer_managed_key.user_assigned_identity_id
}

resource "azurerm_storage_account_customer_managed_key" "hsm" {
  for_each                  = (var.customer_managed_key.enabled && var.customer_managed_key.type == "hsm" ? {type = var.customer_managed_key.type} : {})
  storage_account_id        = var.storage_account_id
  managed_hsm_key_id        = var.customer_managed_key.managed_hsm_key_id
  key_name                  = var.customer_managed_key.key_name
  user_assigned_identity_id = var.customer_managed_key.user_assigned_identity_id
}
