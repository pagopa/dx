terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.7, < 1.0.0"
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

resource "azurerm_subnet" "test_subnet" {
  name = provider::dx::resource_name(
    {
      prefix          = local.prefix,
      environment     = local.env_short,
      location        = local.location,
      name            = "test",
      resource_type   = "subnet",
      instance_number = 1
  })
  resource_group_name  = module.core.network_resource_group_name
  virtual_network_name = module.core.common_vnet.name
  address_prefixes     = ["10.50.200.0/24"]

  delegation {
    name = "default"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}