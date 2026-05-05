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

    random = {
      source  = "hashicorp/random"
      version = "~> 3.8"
    }
  }

  backend "http" {
    address = "https://stategraph.dev.dx.pagopa.it/api/v1/states/backend/3464191c-439c-4520-8c90-9f49ccfc8944"
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
