terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 4.0.0"
    }
  }
}

provider "azurerm" {
  features {}
}

module "starter_pack" {
  source = "../../azure_repo_starter_pack"

  environment = local.environment

  entraid_groups = {
    admins = "io-p-adgroup-admin"
    devs   = "io-p-adgroup-developers"
  }

  tags = local.tags
}
