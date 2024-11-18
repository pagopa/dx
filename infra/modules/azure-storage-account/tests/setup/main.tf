terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.116.0"
    }
  }
}

module "naming_convention" {
  source = "../../../azure-naming-convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}

resource "azurerm_subnet" "snet" {
  name                 = "${module.naming_convention.prefix}-snet-sa-${module.naming_convention.suffix}"
  virtual_network_name = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name  = "${module.naming_convention.project}-common-rg-01"
  address_prefixes     = ["10.20.50.0/24"]
}

resource "azurerm_user_assigned_identity" "user" {
  name                = "${module.naming_convention.prefix}-user-sa-${module.naming_convention.suffix}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.environment.location
}


data "azurerm_subnet" "pep" {
  name                 = "${module.naming_convention.project}-pep-snet-01"
  virtual_network_name = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name  = "${module.naming_convention.project}-common-rg-01"
}

resource "azurerm_resource_group" "rg" {
  name     = "${module.naming_convention.prefix}-rg-sa-${module.naming_convention.suffix}"
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