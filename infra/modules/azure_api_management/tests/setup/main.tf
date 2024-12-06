terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.116.0"
    }
  }
}

module "naming_convention" {
  source  = "pagopa/dx-azure-naming-convention/azurerm"
  version = "~> 0"

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
  name                = "io-p-vnet-common"
  resource_group_name = "io-p-rg-common"
}

resource "azurerm_subnet" "subnet" {
  name                 = "${module.naming_convention.project}-apim-snet-test"
  virtual_network_name = "io-p-vnet-common"
  resource_group_name  = "io-p-rg-common"
  address_prefixes     = ["10.0.50.0/24"]
}

resource "azurerm_resource_group" "rg" {
  name     = "${module.naming_convention.prefix}-rg-apim-${module.naming_convention.suffix}"
  location = var.environment.location
}

output "subnet_id" {
  value = azurerm_subnet.subnet.id
}

output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}

output "vnet" {
  value = {
    name                = data.azurerm_virtual_network.vnet.name
    resource_group_name = data.azurerm_virtual_network.vnet.resource_group_name
  }
}