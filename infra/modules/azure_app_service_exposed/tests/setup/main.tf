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

resource "azurerm_resource_group" "rg" {
  name     = "${module.naming_convention.prefix}-rg-app-${module.naming_convention.suffix}"
  location = var.environment.location
}

output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}