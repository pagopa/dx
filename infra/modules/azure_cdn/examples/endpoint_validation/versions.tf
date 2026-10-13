terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.12"
    }
  }

  backend "azurerm" {
    resource_group_name  = "dx-u-itn-tfstate-rg-01"
    storage_account_name = "dxuitntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.azurecdn.example.endpoint_validation.tfstate"
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}
