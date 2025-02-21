terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4"
    }

    github = {
      source  = "integrations/github"
      version = "~>6"
    }
  }
}

module "naming_convention" {
  source  = "pagopa/dx-azure-naming-convention/azurerm"
  version = "~>0"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = null
    app_name        = var.environment.domain # app_name is mandatory for any resource except resource groups
    instance_number = var.environment.instance_number
  }
}
