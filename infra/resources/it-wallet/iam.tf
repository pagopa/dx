resource "azurerm_user_assigned_identity" "cosno_01" {
  name                = "${local.project}-cosno-id-01"
  resource_group_name = azurerm_resource_group.ps_01.name
  location            = azurerm_resource_group.ps_01.location
}

# TODO
# resource "azurerm_role_assignment" "cosnos_kv_crypto" {
#   role_definition_name = "Key Vault Crypto Service Encryption User"
#   scope                = azurerm_key_vault.psn_02.id
#   principal_id         = azurerm_user_assigned_identity.cosno_01.principal_id
# }
