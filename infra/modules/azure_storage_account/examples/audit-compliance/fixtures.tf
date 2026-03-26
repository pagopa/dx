# Infrastructure prerequisites (data sources and supporting resources)
# that the module under test (mut.tf) depends on.

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_log_analytics_workspace" "law" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "common",
    resource_type = "log_analytics"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "common",
    resource_type = "resource_group"
  }))
}

resource "azurerm_resource_group" "example" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = local.environment.location
}
