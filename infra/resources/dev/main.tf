terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.100.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfdevdx" #tfproddx
    container_name       = "terraform-state"
    key                  = "dx.resources.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}

resource "azurerm_storage_account" "main" {
  name                     = "teststoragemario1"
  resource_group_name      = "dev-mario"
  location                 = "West Europe"
  account_tier             = "Standard"
  account_replication_type = "LRS"
}