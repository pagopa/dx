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
    address = "https://stategraph.dev.dx.pagopa.it/api/v1/states/backend/c306cdd3-324f-47c4-8c53-563205682e9f"
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
