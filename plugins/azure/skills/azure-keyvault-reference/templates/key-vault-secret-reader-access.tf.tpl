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
