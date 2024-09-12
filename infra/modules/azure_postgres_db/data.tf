data "azurerm_resource_group" "this" {
  name = var.resource_group_name
}

#-----------#
# Key Vault #
#-----------#
# data "azurerm_key_vault" "kv" {
#   name                = var.key_vault.name
#   resource_group_name = var.key_vault.resource_group_name
# }

# data "azurerm_key_vault_secret" "pgres_admin_login" {
#   name         = "pgres-flex-admin-login"
#   key_vault_id = data.azurerm_key_vault.kv.id
# }

# data "azurerm_key_vault_secret" "pgres_admin_pwd" {
#   name         = "pgres-flex-admin-pwd"
#   key_vault_id = data.azurerm_key_vault.kv.id
# }

#------------#
# Networking #
#------------#

data "azurerm_virtual_network" "this" {
  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}

data "azurerm_resource_group" "vnet_rg" {
  name = var.virtual_network.resource_group_name
}