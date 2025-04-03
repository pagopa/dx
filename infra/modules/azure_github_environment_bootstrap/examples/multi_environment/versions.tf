terraform {
  required_providers {
    azurerm = {
      source                = "hashicorp/azurerm"
      version               = "~> 4.0"
      configuration_aliases = [azurerm.dev, azurerm.uat]
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
}

# Default provider configuration
provider "azurerm" {
  features {}
}

provider "azurerm" {
  alias           = "dev"
  subscription_id = "d7de83e0-0571-40ad-b63a-64c942385eae" # DEV subscription
  features {}
}

provider "azurerm" {
  alias           = "uat"
  subscription_id = "d7de83e0-0571-40ad-b63a-64c942385eae" # UAT subscription
  features {}
}

provider "github" {
  owner = "pagopa"
}
