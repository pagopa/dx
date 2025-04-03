terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.5, < 1.0.0"
    }
  }
}