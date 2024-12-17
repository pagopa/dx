terraform {

  backend "azurerm" {
    resource_group_name  = "dx-d-itn-network-rg-01"
    storage_account_name = "dxditntfexamplesst01"
    container_name       = "terraform-state"
    key                  = "dx.app_service_exposed.example.complete.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
    }
  }
}

provider "azurerm" {
  features {}
}
