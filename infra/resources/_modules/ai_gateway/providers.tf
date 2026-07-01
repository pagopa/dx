terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.23"
    }
    azuredx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.8"
    }
  }
}
