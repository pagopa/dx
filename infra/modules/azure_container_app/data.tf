data "azurerm_key_vault" "kv" {
  count = var.key_vault != null ? 1 : 0

  name                = var.key_vault.name
  resource_group_name = var.key_vault.resource_group_name
}
