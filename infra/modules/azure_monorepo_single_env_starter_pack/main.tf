terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4.0"
    }

    github = {
      source  = "integrations/github"
      version = "~>6.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~>3.0"
    }
  }
}

module "naming_convention" {
  source = "../azure_naming_convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = null
    app_name        = var.environment.domain # app_name is mandatory for any resource except resource groups
    instance_number = var.environment.instance_number
  }
}
