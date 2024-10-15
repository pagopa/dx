data "azurerm_cosmosdb_account" "cosmos" {
  for_each = { for account in local.accounts : "${account.resource_group_name}|${account.account_name}" => account if account.account_name != null }

  name                = each.value.account_name
  resource_group_name = each.value.resource_group_name
}