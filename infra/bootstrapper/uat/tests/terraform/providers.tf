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

    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }

    github = {
      source  = "hashicorp/github"
      version = "~> 6.12"
    }
  }
}
