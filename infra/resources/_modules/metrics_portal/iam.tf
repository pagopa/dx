# Grant the Container App managed identity permission to read secrets from Key Vault.
# This is required for Key Vault references in Container App secrets and environment variables.
module "container_app_key_vault_roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = module.container_app.principal_id
  subscription_id = local.key_vault_subscription_id

  key_vault = [
    {
      name                = local.key_vault_name
      resource_group_name = local.key_vault_resource_group_name
      description         = "Allow the Container App managed identity to read secrets from Key Vault."
      roles = {
        secrets = "reader"
      }
    }
  ]
}
