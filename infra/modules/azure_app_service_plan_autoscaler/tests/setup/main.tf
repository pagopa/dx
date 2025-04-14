terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.111.0, < 5.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.7, < 1.0.0"
    }
  }
}

locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  virtual_network = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      domain        = null,
      name          = "common",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
      domain        = null,
      name          = "network",
      resource_type = "resource_group"
    }))
  }
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_subnet" "snet" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "test",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    domain        = null,
    name          = "test",
    resource_type = "resource_group"
  }))
}


module "azure_app_service" {
  source = "../../../azure_app_service"

  environment         = var.environment
  tier                = "s"
  resource_group_name = data.azurerm_resource_group.rg.name

  virtual_network = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  subnet_id     = data.azurerm_subnet.snet.id

  app_settings      = {}
  slot_app_settings = {}

  health_check_path = "/health"

  tags = var.tags
}

output "app_service_plan_id" {
  value = module.azure_app_service.app_service.plan.id
}

output "app_service" {
  value = {
    name = module.azure_app_service.app_service.app_service.name
    id   = module.azure_app_service.app_service.app_service.id
  }
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}