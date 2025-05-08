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

  tags = local.tags
}

resource "azurerm_storage_account" "durable_function" {
  count = local.function_app.has_durable

  name                     = local.storage_account.durable_name
  location                 = var.environment.location
  resource_group_name      = var.resource_group_name
  account_tier             = "Standard"
  account_kind             = "StorageV2"
  account_replication_type = local.storage_account.replication_type

  public_network_access_enabled   = true
  shared_access_key_enabled       = false
  default_to_oauth_authentication = true
  allow_nested_items_to_be_public = false

  tags = local.tags
}
