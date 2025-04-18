terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
    }
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.6, < 1.0.0"
    }
  }
}

locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  virtual_network = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "common",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "network",
      resource_type = "resource_group"
    }))
  }
}

data "azurerm_subnet" "snet" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "test",
    resource_type = "resource_group"
  }))
}

module "storage_account" {
  source = "../../../azure_storage_account"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }

  resource_group_name                 = data.azurerm_resource_group.rg.name
  tier                                = "s"
  subnet_pep_id                       = data.azurerm_subnet.pep.id
  force_public_network_access_enabled = true # just for testing
  static_website = {
    enabled        = true
    index_document = "index.html"
  }

  subservices_enabled = {
    blob = true
  }

  tags = var.tags
}

resource "azurerm_dns_zone" "devex_pagopa_it" {
  name                = "devex.pagopa.it"
  resource_group_name = data.azurerm_resource_group.rg.name

  tags = var.tags
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "subnet_id" {
  value = data.azurerm_subnet.snet.id
}

output "resource_group_name" {
  value = data.azurerm_resource_group.rg.name
}

output "storage_account_host_name" {
  value = module.storage_account.primary_web_host
}

output "devex_pagopa_it_zone_name" {
  value = azurerm_dns_zone.devex_pagopa_it.name
}