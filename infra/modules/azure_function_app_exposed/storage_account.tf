resource "azurerm_storage_account" "this" {
  name                     = local.storage_account.name
  location                 = var.environment.location
  resource_group_name      = var.resource_group_name
  account_tier             = "Standard"
  account_kind             = "StorageV2"
  account_replication_type = local.storage_account.replication_type

  public_network_access_enabled   = true
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true
  allow_nested_items_to_be_public = false

  tags = var.tags
}

# resource "azurerm_storage_account_network_rules" "st_network_rules" {
#   storage_account_id = azurerm_storage_account.this.id
#   default_action     = "Deny"
#   bypass             = ["Metrics", "Logging", "AzureServices"]

#   depends_on = [
#     azurerm_linux_function_app.this
#   ]
# }
