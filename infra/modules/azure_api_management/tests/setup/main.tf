terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
    }
  }
}

module "naming_convention" {
  source = "../../../azure_naming_convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}

data "azurerm_virtual_network" "vnet" {
  name                = "dx-d-itn-common-vnet-01"
  resource_group_name = "dx-d-itn-network-rg-01"
}

resource "azurerm_subnet" "subnet" {
  name                 = "${module.naming_convention.project}-apim-snet-test-${module.naming_convention.suffix}"
  virtual_network_name = data.azurerm_virtual_network.vnet.name
  resource_group_name  = data.azurerm_virtual_network.vnet.resource_group_name
  address_prefixes     = ["10.50.250.0/24"]
}

data "azurerm_resource_group" "rg" {
  name = "${module.naming_convention.prefix}-rg-${module.naming_convention.suffix}"
}

output "subnet_id" {
  value = azurerm_subnet.subnet.id
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
