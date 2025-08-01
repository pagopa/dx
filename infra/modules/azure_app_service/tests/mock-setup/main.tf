# Mock setup module for testing without Azure authentication
# This module provides test fixtures and mock data for unit tests

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.8.0, < 5.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.6, < 1.0.0"
    }
  }
}

locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  # Mock data for testing
  mock_data = {
    resource_group_name = "mock-rg-${var.environment.prefix}-${var.environment.env_short}"
    subnet_id          = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/mock-rg/providers/Microsoft.Network/virtualNetworks/mock-vnet/subnets/mock-subnet"
    vnet_name          = "mock-vnet-${var.environment.prefix}-${var.environment.env_short}"
    vnet_rg_name       = "mock-network-rg-${var.environment.prefix}-${var.environment.env_short}"
  }

  # Use mock data when Azure resources are not available
  use_mock_data = var.use_mock_data
}

# Try to get real Azure data, fall back to mock data if not available
data "azurerm_resource_group" "rg" {
  count = local.use_mock_data ? 0 : 1
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))
}

data "azurerm_virtual_network" "vnet" {
  count = local.use_mock_data ? 0 : 1
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "virtual_network"
  }))
  resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "network",
    resource_type = "resource_group"
  }))
}

data "azurerm_subnet" "pep" {
  count = local.use_mock_data ? 0 : 1
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = data.azurerm_virtual_network.vnet[0].name
  resource_group_name  = data.azurerm_virtual_network.vnet[0].resource_group_name
}

# Outputs using either real or mock data
output "pep_id" {
  value = local.use_mock_data ? local.mock_data.subnet_id : data.azurerm_subnet.pep[0].id
}

output "resource_group_name" {
  value = local.use_mock_data ? local.mock_data.resource_group_name : data.azurerm_resource_group.rg[0].name
}

output "vnet" {
  value = {
    name                = local.use_mock_data ? local.mock_data.vnet_name : data.azurerm_virtual_network.vnet[0].name
    resource_group_name = local.use_mock_data ? local.mock_data.vnet_rg_name : data.azurerm_virtual_network.vnet[0].resource_group_name
  }
}