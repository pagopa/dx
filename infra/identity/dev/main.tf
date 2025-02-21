terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4"
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

data "azurerm_subscription" "current" {}

resource "azurerm_resource_group" "rg_identity" {
  name     = "${local.project}-identity-rg-${local.instance_number}"
  location = local.location

  tags = local.tags
}

module "federated_identities" {
  source = "../../modules/azure_federated_identity_with_github"

  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    domain          = local.domain
    instance_number = local.instance_number
  }

  repository = {
    name = local.repo_name
  }

  resource_group_name = azurerm_resource_group.rg_identity.name

  subscription_id = data.azurerm_subscription.current.id

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

module "roles_ci" {
  source       = "../../modules/azure_role_assignments"
  principal_id = module.federated_identities.federated_ci_identity.id

  key_vault = [
    {
      name                = "${local.project}-${local.location_short}-common-kv-01"
      resource_group_name = "${local.project}-${local.location_short}-common-rg-01"
      roles = {
        secrets = "reader"
      }
    }
  ]
}

module "roles_cd" {
  source       = "../../modules/azure_role_assignments"
  principal_id = module.federated_identities.federated_cd_identity.id

  key_vault = [
    {
      name                = "${local.project}-${local.location_short}-common-kv-01"
      resource_group_name = "${local.project}-${local.location_short}-common-rg-01"
      roles = {
        secrets = "reader"
      }
    }
  ]
}
