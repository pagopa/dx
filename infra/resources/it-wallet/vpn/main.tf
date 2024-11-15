terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.117.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "<= 3.02.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "ps-d-itn-tf-rg-01"
    storage_account_name = "psditntfst01"
    container_name       = "terraform-state"
    key                  = "dx.resources.itwallet.vpn.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}
