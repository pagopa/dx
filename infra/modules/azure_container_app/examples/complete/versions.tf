terraform {

  backend "azurerm" {
    resource_group_name  = "dx-d-itn-common-rg-01"
    storage_account_name = "dxditntfexamplesst01"
    container_name       = "terraform-state"
    key                  = "dx.containerapp.example.complete.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 4.10.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~>0"
    }
  }
}

provider "azurerm" {
  features {}
}