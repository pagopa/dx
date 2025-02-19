terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfdevdx"
    container_name       = "terraform-state"
    key                  = "dx.policy.dev.italynorth.tfstate"
  }
}

provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}

module "naming_convention" {
  source      = "pagopa/dx-azure-naming-convention/azurerm"
  version     = "~> 0"
  environment = local.environment
}