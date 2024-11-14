terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.117.0"
    }

    azuread = {
      source = "hashicorp/azuread"
      version = "<= 3.02.0"
    }
  }

  # backend "azurerm" {
  # resource_group_name  = "terraform-state-rg"
  # storage_account_name = "tfdevdx"
  # container_name       = "terraform-state"
  # key                  = "dx.resources.dev.tfstate"
  # }
}

provider "azurerm" {
  features {
  }
}
