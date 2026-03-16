locals {
  key_vault_resource_group_name = split("/", var.key_vault_id)[4]
  key_vault_name                = split("/", var.key_vault_id)[8]
  key_vault_subscription_id     = split("/", var.key_vault_id)[2]
}

# Grant the App Service system-assigned managed identity permission to read
# secrets from Key Vault. This is required for Key Vault references in app_settings.
module "app_service_key_vault_roles" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 1.0"

  principal_id    = module.app_service.app_service.principal_id
  subscription_id = local.key_vault_subscription_id

  key_vault = [
    {
      name                = local.key_vault_name
      resource_group_name = local.key_vault_resource_group_name
      description         = "Allow the Next.js App Service managed identity to read secrets from Key Vault."
      roles = {
        secrets = "reader"
      }
    }
  ]
}
