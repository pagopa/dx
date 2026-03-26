terraform {
  required_version = ">= 1.11.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.23"
    }
    dx = {
      source = "pagopa-dx/azure"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.0"
    }
  }
}
