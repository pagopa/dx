# Test fixtures - supporting infrastructure required for the test

resource "azurerm_resource_group" "e2e" {
  name = provider::dx::resource_name(merge(local.environment, {
    domain        = "e2e",
    app_name      = "cdn",
    resource_type = "resource_group"
    domain        = ""
  }))
  location = local.environment.location
}

#trivy:ignore:AZU-0012 Public access is required for the CDN origin.
#trivy:ignore:AZU-0057 This ephemeral test fixture does not store production data.
#trivy:ignore:AZU-0058 CDN E2E tests do not validate storage redundancy.
#trivy:ignore:AZU-0061 This ephemeral test fixture does not require infrastructure encryption.
resource "azurerm_storage_account" "cdn_origin" {
  name                     = provider::dx::resource_name(merge(local.environment, { resource_type = "storage_account" }))
  resource_group_name      = azurerm_resource_group.e2e.name
  location                 = local.environment.location
  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"

  public_network_access           = "Enabled"
  allow_nested_items_to_be_public = true

  tags = local.tags
}

resource "azurerm_storage_account_static_website" "cdn_origin" {
  storage_account_id = azurerm_storage_account.cdn_origin.id
  index_document     = "index.html"
}
