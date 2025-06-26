terraform {
  required_providers {
    azurerm = {
      source                = "hashicorp/azurerm"
      version               = "~> 4.0"
      configuration_aliases = [azurerm.dev, azurerm.prod]
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }

    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "dx-p-itn-tfstate-rg-01"
    storage_account_name = "dxpitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.bootstrapper.multi.tfstate"
  }
}

# Default provider configuration
provider "azurerm" {
  features {}
}

provider "azurerm" {
  alias           = "dev"
  subscription_id = "35e6e3b2-4388-470e-a1b9-ad3bc34326d1" # DEV subscription
  features {}
}

provider "azurerm" {
  alias           = "prod"
  subscription_id = "02a23258-2e41-433c-8e9a-465b99e77bca" # prod subscription
  features {}
}

provider "github" {
  owner = "pagopa"
}
