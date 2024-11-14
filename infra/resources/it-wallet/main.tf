terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
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
