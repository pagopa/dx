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
    key                  = "dx.identity.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}

resource "azurerm_resource_group" "rg_identity" {
  name     = "${local.project}-identity-rg"
  location = local.location

  tags = local.tags
}

module "federated_identities" {
  source = "../../modules/azure_federated_identity_with_github"

  prefix    = local.prefix
  env_short = local.env_short
  env       = local.env

  repositories = [local.repo_name]

  tags = local.tags

  depends_on = [
    azurerm_resource_group.rg_identity
  ]
}
