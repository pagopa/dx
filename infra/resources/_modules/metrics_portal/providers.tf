terraform {
  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
    }
    dx = {
      source = "pagopa-dx/azure"
    }
    random = {
      source = "hashicorp/random"
    }
  }
}
