data "azurerm_key_vault" "kv" {
  name                = var.key_vault.name
  resource_group_name = var.key_vault.resource_group_name
}
