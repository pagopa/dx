terraform {
  required_version = "~> 1.15.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
  }
}

provider "azurerm" {
  features {}

  storage_use_azuread = true
}

provider "dx" {}
