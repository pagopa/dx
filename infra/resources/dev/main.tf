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

  gh_runner = {
    # repo_name = "dx"
    snet_cidr = "10.50.242.0/23"
  }

  vpn = {
    enabled                  = true
    cidr_subnet              = "10.50.133.0/24"
    dnsforwarder_cidr_subnet = "10.50.252.8/29"
  }

  test_enabled = true

  tags = local.tags
}

module "container_app_job_selfhosted_runner" {
  source = "../../modules/github_selfhosted_runner_on_container_app_jobs"

  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    instance_number = "01"
  }

  resource_group_name = module.core.github_runner.resource_group_name

  repository = {
    name = "dx"
  }

  container_app_environment = {
    id       = module.core.github_runner.environment_id
    location = local.location
  }

  key_vault = {
    name                = module.core.common_key_vault.name
    resource_group_name = module.core.common_key_vault.resource_group_name
    use_rbac            = true
  }

  tags = local.tags
}