# Optional Key Vault secret for the admin password.
# Created only when var.key_vault is provided.
# Uses value_wo so the password is sent to Azure on apply but never stored in state.
resource "azurerm_key_vault_secret" "admin_password" {
  count = var.key_vault != null ? 1 : 0

  name         = coalesce(var.key_vault.secret_name, "${local.db.name}-admin-password")
  key_vault_id = var.key_vault.id

  # Shares the same version counter as the PostgreSQL server so both resources
  # are updated together on password rotation.
  value_wo         = var.admin_password
  value_wo_version = var.admin_password_version
}
