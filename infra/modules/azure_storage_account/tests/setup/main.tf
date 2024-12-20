terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
    }
  }
}

module "naming_convention" {
  source = "../../../azure_naming_convention"

  environments = [{
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }]
}

resource "azurerm_subnet" "snet" {
  name                 = "${module.naming_convention.prefix}-sa-snet-${module.naming_convention.suffix["1"]}"
  virtual_network_name = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name  = "${module.naming_convention.project}-network-rg-01"
  address_prefixes     = ["10.50.200.0/24"]
}

resource "azurerm_user_assigned_identity" "user" {
  name                = "${module.naming_convention.prefix}-sa-user-${module.naming_convention.suffix["1"]}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.environment.location
}


data "azurerm_subnet" "pep" {
  name                 = "${module.naming_convention.project}-pep-snet-01"
  virtual_network_name = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name  = "${module.naming_convention.project}-network-rg-01"
}

resource "azurerm_resource_group" "rg" {
  name     = "${module.naming_convention.prefix}-sa-rg-${module.naming_convention.suffix["1"]}"
  location = var.environment.location
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "subnet_id" {
  value = azurerm_subnet.snet.id
}

output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}

output "user_assigned_identity_id" {
  value = azurerm_user_assigned_identity.user.id
}
