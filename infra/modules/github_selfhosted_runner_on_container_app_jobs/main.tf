terraform {

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
    }
  }
}

module "naming_convention" {
  source  = "pagopa-dx/azure-naming-convention/azurerm"
  version = "~> 0.0"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = null
    app_name        = length(var.repository.name) > 16 ? substr(var.repository.name, 0, 16) : var.repository.name
    instance_number = var.environment.instance_number
  }
}
