terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "<= 3.02.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "ps-d-itn-tf-rg-01"
    storage_account_name = "psditntfst01"
    container_name       = "terraform-state"
    key                  = "dx.resources.itwallet.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}

resource "azurerm_resource_group" "ps_01" {
  name     = "${local.project}-rg-01"
  location = local.location

  tags = local.tags
}

resource "azurerm_resource_group" "networking_01" {
  name     = "${local.project}-networking-rg-01"
  location = local.location

  tags = local.tags
}
