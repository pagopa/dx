terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.70"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 2.9"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.10"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.14"
    }
  }
}
