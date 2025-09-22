resource "azurerm_key_vault_access_policy" "keyvault_containerapp" {
  count = var.key_vault.use_rbac ? 0 : 1

  key_vault_id = local.key_vault_id
  tenant_id    = azurerm_container_app_job.github_runner.identity[0].tenant_id
  object_id    = azurerm_container_app_job.github_runner.identity[0].principal_id

  secret_permissions = [
    "Get",
  ]
}

resource "azurerm_role_assignment" "keyvault_containerapp" {
  count = var.key_vault.use_rbac ? 1 : 0

  scope                = local.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_container_app_job.github_runner.identity[0].principal_id
  description          = "Allow the Container App Job ${local.container_apps.job_name} to read to secrets"
}
