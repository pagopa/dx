terraform {
  required_version = ">= 1.16.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.8"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "azuread" {}
