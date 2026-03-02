# Virtual Network for subnet integration
data "azurerm_virtual_network" "vnet" {
  name                = var.virtual_network.name
  resource_group_name = var.virtual_network.resource_group_name
}

# Key Vault for secret references
data "azurerm_key_vault" "kv" {
  name                = var.key_vault_name
  resource_group_name = var.key_vault_resource_group_name
}
