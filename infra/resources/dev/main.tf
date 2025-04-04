terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
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

  gh_runner_snet = "10.50.242.0/23"

  vpn = {
    cidr_subnet              = "10.50.133.0/24"
    dnsforwarder_cidr_subnet = "10.50.252.8/29"
  }

  test_enabled = true

  tags = local.tags
}

resource "azurerm_role_assignment" "kv_ci" {
  scope                = module.core.common_key_vault.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_user_assigned_identity.infra_dev_ci.principal_id
  description          = "Allow CI identity to access Key Vault secrets"
}

resource "azurerm_role_assignment" "kv_cd" {
  scope                = module.core.common_key_vault.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_user_assigned_identity.infra_dev_cd.principal_id
  description          = "Allow CD identity to access Key Vault secrets"
}
