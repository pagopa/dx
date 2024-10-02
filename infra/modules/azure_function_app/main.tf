provider "azurerm" {
  features {}

  storage_use_azuread = true
}

module "naming_convention" {
  source = "../azure_naming_convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}
