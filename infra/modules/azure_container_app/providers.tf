terraform {
  required_version = ">= 1.14.0"
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
