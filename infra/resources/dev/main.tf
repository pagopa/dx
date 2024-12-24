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

  gh_runner_snet = "10.50.242.0/23"

  vpn = {
    cidr_subnet              = "10.50.133.0/24"
    dnsforwarder_cidr_subnet = "10.50.252.8/29"
  }

  test_enabled = true

  tags = local.tags
}

module "dx-azure-naming-convention" {
  source  = "pagopa/dx-azure-naming-convention/azurerm"
  version = "0.0.3"

  environment = {
    prefix          = "a"
    env_short       = "a"
    location        = "a"
    app_name        = "a"
    instance_number = "a"
  }
}

module "dx-azure-naming-conventionz" {
  source  = "pagopa/dx-azure-naming-convention/azurerm"
  version = "0.0.1"

  environment = {
    prefix          = "a"
    env_short       = "a"
    location        = "a"
    app_name        = "a"
    instance_number = "a"
  }
}