terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.20"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.10"
    }
  }
}
