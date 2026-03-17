locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location,
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  # Resolves names of shared pre-provisioned test infrastructure.
  # The test infra is named using test_kind ("integration") as the app name
  # and an empty domain, following the pagopa-dx naming convention.
  existing_resources = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location,
    domain          = "",
    name            = var.test_kind,
    instance_number = tonumber(var.environment.instance_number),
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

data "azurerm_subnet" "pep" {
  name                 = provider::dx::resource_name(merge(local.existing_resources, { resource_type = "subnet", name = "pep" }))
  resource_group_name  = data.azurerm_resource_group.test.name
  virtual_network_name = data.azurerm_virtual_network.vnet.name
}

# Resource group created for the System Under Test (SUT).
resource "azurerm_resource_group" "sut" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = var.environment.location
  tags     = var.tags
}

output "resource_group_name" {
  value = azurerm_resource_group.sut.name
}

output "subscription_id" {
  value = data.azurerm_client_config.current.subscription_id
}

output "subnet_pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "private_dns_zone_resource_group_name" {
  value = data.azurerm_resource_group.network.name
}

output "virtual_network" {
  value = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_resource_group.network.name
  }
}

output "tags" {
  value = var.tags
}
