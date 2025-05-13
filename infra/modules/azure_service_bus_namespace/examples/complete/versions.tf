terraform {

  backend "azurerm" {
    resource_group_name  = "dx-d-itn-common-rg-01"
    storage_account_name = "dxditntfexamplesst01"
    container_name       = "terraform-state"
    key                  = "dx.service_bus_namespace.example.complete.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.2.0"
    }
  }
}

provider "azurerm" {
  features {}
}
