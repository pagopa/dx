module "roles" {
  count = var.key_vault == null ? 0 : 1

  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.3"

  principal_id    = azurerm_app_configuration.this.identity[0].principal_id
  subscription_id = var.key_vault.subscription_id

  key_vault = [
    {
      name                = var.key_vault.name
      resource_group_name = var.key_vault.resource_group_name
      has_rbac_support    = var.key_vault.has_rbac_support
      description         = "Allow AppConfiguration to read Key Vault secrets"
      roles = {
        secrets = "reader"
      }
    }
  ]
}
