terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.8"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.6.0, < 1.0.0"
    }
    azapi = {
      source = "azure/azapi"
    }
  }
}
