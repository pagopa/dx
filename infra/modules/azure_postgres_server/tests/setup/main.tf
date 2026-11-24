terraform {
  required_version = ">= 1.16.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.23, < 6.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
  }
}

locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location,
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  existing_resources = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location,
    domain          = "",
    name            = var.test_kind,
    instance_number = tonumber(var.environment.instance_number),
  }
}

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
  resource_group_name  = data.azurerm_resource_group.network.name
  virtual_network_name = data.azurerm_virtual_network.vnet.name
}

resource "azurerm_resource_group" "sut" {
  name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "resource_group" }))
  location = var.environment.location
  tags     = var.tags
}

output "resource_group_name" {
  value = azurerm_resource_group.sut.name
}

output "subnet_pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "private_dns_zone_resource_group_name" {
  value = data.azurerm_resource_group.network.name
}

output "tags" {
  value = var.tags
}
