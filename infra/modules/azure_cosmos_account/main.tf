terraform {
  required_version = ">= 1.14.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    pagopa-dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
  }
}
