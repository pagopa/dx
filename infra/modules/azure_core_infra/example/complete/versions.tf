terraform {

  backend "azurerm" {
    resource_group_name  = "dx-u-itn-tfstate-rg-01"
    storage_account_name = "dxuitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core_infra.example.complete.tfstate"
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
