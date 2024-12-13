terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.116.0"
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

data "azurerm_subnet" "pep" {
  name                 = "${module.naming_convention.project}-pep-snet-01"
  virtual_network_name = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name  = "${module.naming_convention.project}-network-rg-01"
}

resource "azurerm_resource_group" "rg" {
  name     = "${module.naming_convention.prefix}-rg-cosno-${module.naming_convention.suffix}"
  location = var.environment.location
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}

output "pvt_service_connection_name" {
  value = "${module.naming_convention.prefix}-cosno-pep-${module.naming_convention.suffix}"
}
