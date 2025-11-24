resource "azurerm_app_configuration" "this" {
  name                = provider::pagopa-dx::resource_name(merge(local.naming_config, { resource_type = "app_configuration" }))
  resource_group_name = var.resource_group_name
  location            = var.environment.location

  identity {
    type = "SystemAssigned"
  }

  sku                                  = local.appcs.sku_name
  data_plane_proxy_authentication_mode = "Pass-through"
  local_auth_enabled                   = false

  public_network_access    = "Disabled"
  purge_protection_enabled = true

  tags = local.tags
}
