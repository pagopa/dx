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
  features {}
}

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
        dx-d-itn-test-rg-01 = [
          "User Access Administrator",
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
  source          = "../../modules/azure_role_assignments"
  principal_id    = module.federated_identities.federated_ci_identity.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [
    {
      name                = data.azurerm_key_vault.common.name
      resource_group_name = data.azurerm_key_vault.common.resource_group_name
      description         = "Allow dx repo CI to read secrets"
      roles = {
        secrets = "reader"
      }
    }
  ]
}

module "roles_cd" {
  source          = "../../modules/azure_role_assignments"
  principal_id    = module.federated_identities.federated_cd_identity.principal_id
  subscription_id = data.azurerm_subscription.current.subscription_id

  key_vault = [
    {
      name                = data.azurerm_key_vault.common.name
      resource_group_name = data.azurerm_key_vault.common.resource_group_name
      description         = "Allow dx repo CD to read secrets"
      roles = {
        secrets = "reader"
      }
    }
  ]
}
