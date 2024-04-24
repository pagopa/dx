terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.100.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfproddx"
    container_name       = "terraform-state"
    key                  = "dx.resources.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}

resource "azurerm_resource_group" "dx_typescript" {
  name     = "dxt-${local.env_short}-identity-rg"
  location = local.location

  tags = local.tags
}
