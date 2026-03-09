# Grant the App Service system-assigned managed identity permission to read
# secrets from Key Vault. This is required for Key Vault references in app_settings.
resource "azurerm_role_assignment" "app_service_kv_secrets_user" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.app_service.app_service.principal_id
  description          = "Allow the Next.js App Service managed identity to read secrets from Key Vault."
}
