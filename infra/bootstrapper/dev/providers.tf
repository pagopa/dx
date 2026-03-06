terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.0"
    }

    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }

    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }
  }

  backend "http" {
    address = "https://stategraph.dev.dx.pagopa.it/api/v1/states/backend/d21769c8-a0cb-46c4-95c7-7c493bf621a8"
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}

provider "dx" {}

provider "github" {
  owner = "pagopa"
}
