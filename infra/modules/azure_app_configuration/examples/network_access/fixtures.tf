resource "azurerm_resource_group" "e2e_appcs" {
  name = provider::pagopa-dx::resource_name(merge(local.naming_config, {
    domain        = "e2e"
    name          = "appcs",
    resource_type = "resource_group"
  }))
  location = local.environment.location

  tags = local.tags
}
