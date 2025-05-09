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

# Outputs

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "snet_id" {
  value = data.azurerm_subnet.snet.id
}

output "virtual_network" {
  value = {
    name                = local.virtual_network.name
    resource_group_name = local.virtual_network.resource_group_name
  }
}

output "environment" {
  value = var.environment
}

output "tags" {
  value = var.tags
}