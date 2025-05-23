terraform {

  backend "azurerm" {
    resource_group_name  = "dx-d-itn-common-rg-01"
    storage_account_name = "dxditntfexamplesst01"
    container_name       = "terraform-state"
    key                  = "dx.gh_runner.example.basic.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4"
    }
  }
}

provider "azurerm" {
  features {}
}
