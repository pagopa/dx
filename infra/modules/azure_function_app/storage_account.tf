resource "azurerm_storage_account" "this" {
  name                     = replace("${local.project}-${var.domain}-${var.app_name}-st-${var.instance_number}", "-", "")
  location                 = var.location
  resource_group_name      = var.resource_group_name
  account_tier             = "Standard"
  account_kind             = "StorageV2"
  account_replication_type = "ZRS"

  public_network_access_enabled = false
  # shared_access_key_enabled       = false
  default_to_oauth_authentication = true

  tags = var.tags
}
