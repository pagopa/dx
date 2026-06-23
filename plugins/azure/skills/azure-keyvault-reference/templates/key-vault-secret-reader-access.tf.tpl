# Grant the app runtime identity read access to Key Vault secrets.
# Prefer the DX role-assignment module in DX Terraform code.

module "<APP_NAME>_key_vault_reader" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> <MAJOR.MINOR>"

  principal_id    = <APP_PRINCIPAL_ID>
  subscription_id = <SUBSCRIPTION_ID>

  key_vault = [
    {
      name                = <KEY_VAULT_NAME>
      resource_group_name = <KEY_VAULT_RESOURCE_GROUP_NAME>
      description         = "Allow <APP_NAME> to resolve Key Vault secret references"
      roles = {
        secrets = "reader"
      }
    }
  ]
}

# Raw fallback when the DX role-assignment module is unavailable:
resource "azurerm_role_assignment" "<APP_NAME>_key_vault_reader" {
  scope                = <KEY_VAULT_ID>
  role_definition_name = "Key Vault Secrets User"
  principal_id         = <APP_PRINCIPAL_ID>
  description          = "Allow <APP_NAME> to resolve Key Vault secret references"
}

# Legacy Key Vault access-policy fallback when the vault does not use Azure RBAC:
resource "azurerm_key_vault_access_policy" "<APP_NAME>_secret_reader" {
  key_vault_id       = <KEY_VAULT_ID>
  tenant_id          = <TENANT_ID>
  object_id          = <APP_PRINCIPAL_ID>
  secret_permissions = ["Get", "List"]
}
