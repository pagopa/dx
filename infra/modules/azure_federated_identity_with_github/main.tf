terraform {
  required_version = ">= 1.16.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.0, < 6.0.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
  }
}
