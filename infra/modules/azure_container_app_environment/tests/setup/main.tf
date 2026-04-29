locals {
  existing_resources = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = ""
    name            = var.test_kind
    instance_number = tonumber(var.environment.instance_number)
  }
}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "test" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group" }))
}

data "azurerm_resource_group" "network" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group", name = "network" }))
}

data "azurerm_virtual_network" "vnet" {
  name                = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "virtual_network" }))
  resource_group_name = data.azurerm_resource_group.test.name
}

data "azurerm_log_analytics_workspace" "logs" {
  name                = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "log_analytics" }))
  resource_group_name = data.azurerm_resource_group.test.name
}

output "subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "resource_group_name" {
  value = data.azurerm_resource_group.test.name
}

output "network_resource_group_name" {
  value = data.azurerm_resource_group.network.name
}

output "vnet_id" {
  value = data.azurerm_virtual_network.vnet.id
}

output "log_analytics_workspace_id" {
  value = data.azurerm_log_analytics_workspace.logs.id
}
