data "azurerm_key_vault" "kv_common" {
  name                = var.key_vault.name
  resource_group_name = var.key_vault.resource_group_name
}

data "azurerm_key_vault_secret" "github_pat" {
  key_vault_id = data.azurerm_key_vault.kv_common.id
  name         = var.key_vault.secret_name
}