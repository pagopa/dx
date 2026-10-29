terraform {
  required_version = ">= 1.16.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 5.0.0, < 6.0.0"
    }

    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }

    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
  }
}
