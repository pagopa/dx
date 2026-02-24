locals {
  virtual_network = {
    name = provider::dx::resource_name(merge(var.environment, {
      domain        = null
      app_name      = "integration",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(var.environment, {
      domain        = null
      app_name      = "integration",
      resource_type = "resource_group"
    }))
  }
}

data "azurerm_subnet" "pep" {
  name = provider::dx::resource_name(merge(var.environment, {
    domain        = null,
    app_name      = "pep",
    resource_type = "subnet"
  }))
  virtual_network_name = local.virtual_network.name
  resource_group_name  = local.virtual_network.resource_group_name
}

resource "azurerm_resource_group" "rg" {
  name = provider::dx::resource_name(merge(var.environment, {
    resource_type = "resource_group"
  }))
  location = var.environment.location
}

data "azurerm_resource_group" "network" {
  name = provider::dx::resource_name(merge(var.environment, {
    domain        = null,
    resource_type = "resource_group"
    app_name      = "network"
  }))
}

module "storage_account" {
  source      = "pagopa-dx/azure-storage-account/azurerm"
  version     = "~> 2.0"
  environment = var.environment

  resource_group_name                 = azurerm_resource_group.rg.name
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

data "azurerm_dns_zone" "integration_dx_pagopa_it" {
  name                = "integration.dx.pagopa.it"
  resource_group_name = data.azurerm_resource_group.network.name
}

resource "azurerm_cdn_frontdoor_profile" "this" {
  name = provider::dx::resource_name(merge(
    var.environment, {
      resource_type   = "cdn_frontdoor_profile",
      instance_number = "02"
  }))
  resource_group_name = azurerm_resource_group.rg.name
  sku_name            = "Standard_AzureFrontDoor"

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags

  timeouts {
    delete = "60m"
    update = "30m"
  }
}

output "pep_id" {
  value = data.azurerm_subnet.pep.id
}

output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}

output "storage_account_host_name" {
  value = module.storage_account.primary_web_host
}

output "dns_zone" {
  value = {
    name                = data.azurerm_dns_zone.integration_dx_pagopa_it.name
    resource_group_name = data.azurerm_dns_zone.integration_dx_pagopa_it.resource_group_name
  }
}

output "storage_account_id" {
  value = module.storage_account.id
}

output "cdn_profile_id" {
  value = azurerm_cdn_frontdoor_profile.this.id
}
