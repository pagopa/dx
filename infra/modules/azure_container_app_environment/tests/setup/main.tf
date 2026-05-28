locals {
  existing_resources = {
    prefix          = var.environment.prefix
    environment     = var.environment.env_short
    location        = var.environment.location
    domain          = ""
    name            = var.test_kind
    instance_number = tonumber(var.environment.instance_number)
  }

  vnet_address_space = "10.0.0.0/21"
}

data "azurerm_resource_group" "test" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group" }))
}

data "azurerm_resource_group" "network" {
  name = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "resource_group", name = "network" }))
}

resource "azurerm_virtual_network" "this" {
  name                = provider::dx::resource_name(merge(var.environment, { resource_type = "virtual_network" }))
  location            = data.azurerm_resource_group.test.location
  resource_group_name = data.azurerm_resource_group.test.name
  address_space       = [local.vnet_address_space]

  tags = var.tags
}

resource "dx_available_subnet_cidr" "pep_subnet" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 27
}

resource "azurerm_subnet" "pep" {
  name                 = provider::dx::resource_name(merge(var.environment, { domain = "", resource_type = "subnet", app_name = "pep" }))
  resource_group_name  = data.azurerm_resource_group.test.name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [dx_available_subnet_cidr.pep_subnet.cidr_block]
}

data "azurerm_private_dns_zone" "container_apps" {
  name                = "privatelink.${var.environment.location}.azurecontainerapps.io"
  resource_group_name = data.azurerm_resource_group.network.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "container_apps" {
  name                  = azurerm_virtual_network.this.name
  resource_group_name   = data.azurerm_resource_group.network.name
  private_dns_zone_name = data.azurerm_private_dns_zone.container_apps.name
  virtual_network_id    = azurerm_virtual_network.this.id
  registration_enabled  = false

  tags = var.tags
}

data "azurerm_log_analytics_workspace" "logs" {
  name                = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "log_analytics" }))
  resource_group_name = data.azurerm_resource_group.test.name
}

output "resource_group_name" {
  value = data.azurerm_resource_group.test.name
}

output "network_resource_group_name" {
  value = data.azurerm_resource_group.network.name
}

output "vnet_id" {
  value = azurerm_virtual_network.this.id
}

output "log_analytics_workspace_id" {
  value = data.azurerm_log_analytics_workspace.logs.id
}
