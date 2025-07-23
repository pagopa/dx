terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
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

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/azure_api_management/tests"
    ManagementTeam = "Developer Experience"
    Test           = "true"
    TestName       = "Create APIM for test"
  }
}

data "azurerm_virtual_network" "vnet" {
  name                = "dx-d-itn-common-vnet-01"
  resource_group_name = "dx-d-itn-network-rg-01"
}

resource "dx_available_subnet_cidr" "cidr" {
  virtual_network_id = data.azurerm_virtual_network.vnet.id
  prefix_length      = 24
}

resource "azurerm_subnet" "subnet" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "apim_subnet"
  }))
  virtual_network_name = data.azurerm_virtual_network.vnet.name
  resource_group_name  = data.azurerm_virtual_network.vnet.resource_group_name
  address_prefixes     = [dx_available_subnet_cidr.cidr.cidr_block]
}

resource "azurerm_public_ip" "pip" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "apim-test",
    resource_type = "public_ip"
  }))
  resource_group_name = data.azurerm_virtual_network.vnet.resource_group_name
  location            = var.environment.location
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = ["1", "2"]

  tags = local.tags
}

data "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))
}

output "subnet_id" {
  value = azurerm_subnet.subnet.id
}

output "pip_id" {
  value = azurerm_public_ip.pip.id
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "vnet" {
  value = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_virtual_network.vnet.resource_group_name
  }
}

output "tags" {
  value = local.tags
}
