terraform {
  required_providers {
    dx = {
      source = "pagopa-dx/azure"
    }

    azurerm = {
      source = "hashicorp/azurerm"
    }

    random = {
      source = "hashicorp/random"
    }
  }
}
