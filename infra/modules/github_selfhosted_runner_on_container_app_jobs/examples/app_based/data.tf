data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "e2e" {
  name = provider::dx::resource_name(merge(local.shared_testing_config, { resource_type = "resource_group" }))
}

data "azurerm_virtual_network" "e2e" {
  name                = provider::dx::resource_name(merge(local.shared_testing_config, { resource_type = "virtual_network" }))
  resource_group_name = data.azurerm_resource_group.e2e.name
}

data "azurerm_log_analytics_workspace" "e2e" {
  name                = provider::dx::resource_name(merge(local.shared_testing_config, { resource_type = "log_analytics" }))
  resource_group_name = data.azurerm_resource_group.e2e.name
}
