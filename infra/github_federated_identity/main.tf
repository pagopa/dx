terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.97.1"
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

module "federated_identities" {
  source = "github.com/pagopa/dx-typescript//infra/modules/azure_identity_federation_github?ref=DEVEX-50-produrre-una-configurazione-terraform-per-le-identity-git-hub-per-autorizzare-le-modifiche-di-infrastruttura-tramite-pipeline"

  prefix       = "dx"
  env_short    = "p"
  env          = "prod"
  repositories = ["dx"]

  continuos_integration = {
    enable = true
    roles = {
      subscription = [
        "Reader",
        "Reader and Data Access"
      ]
      resource_groups = {
        terraform-state-rg = [
          "Storage Blob Data Contributor"
        ]
      }
    }
  }

  continuos_delivery = {
    enable = true
    roles = {
      subscription = [
        "Reader",
        "Reader and Data Access"
      ]
      resource_groups = {
        terraform-state-rg = [
          "Storage Blob Data Contributor"
        ]
      }
    }
  }

  tags = local.tags
}
