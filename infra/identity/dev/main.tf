terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.117.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfdevdx"
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

  continuos_integration = {
    enable = true
    roles = {
      subscription = [
        "Contributor", # for tf tests
        "Reader and Data Access",
        "PagoPA IaC Reader",
        "DocumentDB Account Contributor"
      ]
      resource_groups = {
        terraform-state-rg = [
          "Storage Blob Data Contributor"
        ]
      }
    }
  }

  tags = local.tags

  depends_on = [
    azurerm_resource_group.rg_identity
  ]
}
