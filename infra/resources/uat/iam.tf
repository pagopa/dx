resource "azurerm_role_assignment" "infra_cd_key_vault_crypto" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow Infra CD Identity to manage KeyVault keys operations. Used by Terraform integration tests on ephemeral KeyVaults."
}

module "automation_cd_common_key_vault_certificates" {
  source  = "pagopa-dx/azure-role-assignments/azurerm"
  version = "~> 2.1"

  principal_id    = data.azurerm_user_assigned_identity.automation_cd.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [
    {
      name                = module.azure_core_values.common_key_vault.name
      resource_group_name = module.azure_core_values.common_key_vault.resource_group_name
      description         = "Allow Automation CD Tests Identity to import the staging certificate used by the renew TLS certificate E2E test."
      roles = {
        certificates = "writer"
      }
    }
  ]
}
