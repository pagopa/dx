data "azurerm_client_config" "current" {}

data "azurerm_key_vault" "this" {
  for_each = { for key_vault in local.vaults : "${key_vault.resource_group_name}|${key_vault.name}" => key_vault }

  name                = each.value.name
  resource_group_name = each.value.resource_group_name
}
