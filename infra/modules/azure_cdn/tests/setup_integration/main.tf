locals {
  virtual_network = {
    name = provider::dx::resource_name(merge(var.environment, {
      name          = "common",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(var.environment, {
      name          = "network",
      resource_type = "resource_group"
    }))
  }
}

data "azurerm_subnet" "snet" {
  name = provider::dx::resource_name(merge(var.environment, {
    name          = "test",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(var.environment, {
    name          = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

resource "azurerm_resource_group" "integration" {
  name = provider::dx::resource_name(merge(var.environment, {
    name          = "cdn",
    resource_type = "resource_group"
  }))
  location = var.environment.location
}

module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 2.0"

  environment                         = var.environment
  resource_group_name                 = azurerm_resource_group.integration.name
  use_case                            = "development"
  subnet_pep_id                       = data.azurerm_subnet.pep.id
  force_public_network_access_enabled = true
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
  resource_group_name = azurerm_resource_group.integration.name

  tags = var.tags
}

module "azure_cdn_integration" {
  source = "../.."

  resource_group_name = azurerm_resource_group.integration.name

  environment = var.environment

  waf_enabled = false

  origins = {
    primary = {
      host_name = module.storage_account.primary_web_host
      priority  = 1
    }
  }

  tags = var.tags
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "subnet_id" {
  value = data.azurerm_subnet.snet.id
}

output "resource_group_name" {
  value = azurerm_resource_group.integration.name
}

output "storage_account_host_name" {
  value = module.storage_account.primary_web_host
}

output "devex_pagopa_it_zone_name" {
  value = azurerm_dns_zone.devex_pagopa_it.name
}

output "storage_account_id" {
  value = module.storage_account.id
}

output "cdn_profile_id" {
  value = module.azure_cdn_integration.id
}
