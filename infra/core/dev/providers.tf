terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }

    azuredx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }

    awsdx = {
      source  = "pagopa-dx/aws"
      version = "~> 0.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxditntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.dev.tfstate"
  }
}

# Default provider configuration
provider "azurerm" {
  features {}
}

provider "aws" {
  region = local.aws_environment.region
}

provider "awsdx" {
  prefix      = local.aws_environment.prefix
  environment = local.aws_environment.env_short
  region      = local.aws_environment.region
}

provider "azuredx" {
  prefix      = local.azure_environment.prefix
  environment = local.azure_environment.env_short
  location    = local.azure_environment.location
}
