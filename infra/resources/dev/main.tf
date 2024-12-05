terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.114.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfdevdx"
    container_name       = "terraform-state"
    key                  = "dx.resources.dev.tfstate"
  }
}

provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}

resource "azurerm_resource_group" "dx" {
  name     = "${local.prefix}-${local.env_short}-${local.location_short}-rg-01"
  location = local.location

  tags = local.tags
}

module "core" {
  source = "../../modules/azure_core_infra"
  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    domain          = "test"
    app_name        = "core"
    instance_number = "01"
  }

  virtual_network_cidr = "10.50.0.0/16"
  pep_subnet_cidr      = "10.50.2.0/23"

  test_enabled = true

  tags = local.tags
}