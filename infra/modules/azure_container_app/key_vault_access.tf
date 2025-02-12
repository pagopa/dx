resource "azurerm_key_vault_access_policy" "kv_ca_policy" {
  count = var.key_vault != null && !try(var.key_vault.use_rbac, false) ? 1 : 0

  key_vault_id = data.azurerm_key_vault.kv[0].id
  tenant_id    = azurerm_container_app.this.identity[0].tenant_id
  object_id    = azurerm_container_app.this.identity[0].principal_id

  secret_permissions = [
    "Get",
  ]
}

resource "azurerm_role_assignment" "kv_ca_role" {
  count = var.key_vault != null && try(var.key_vault.use_rbac, false) ? 1 : 0

  scope                = data.azurerm_key_vault.kv[0].id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_container_app.this.identity[0].principal_id
  description          = "Allow the Container App ${azurerm_container_app.this.name} to read to secrets"
}
