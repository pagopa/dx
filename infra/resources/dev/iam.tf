resource "azurerm_role_assignment" "infra_cd_key_vault_crypto" {
  scope                = data.azurerm_subscription.current.id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd.principal_id
  description          = "Allow Infra CD Identity to manage KeyVault keys operations. Used by Terraform integration tests on ephemeral KeyVaults."
}
