terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.70"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.9"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

provider "random" {}
