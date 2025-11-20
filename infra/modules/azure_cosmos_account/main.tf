terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
    }
    pagopa-dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.6, < 1.0.0"
    }
  }
}
