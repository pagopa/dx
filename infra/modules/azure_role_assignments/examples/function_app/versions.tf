terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
    }
  }
}

provider "azurerm" {
  features {}

  storage_use_azuread = true
}
