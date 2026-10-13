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

resource "azurerm_storage_account" "cdn_origin" {
  name                     = provider::dx::resource_name(merge(var.environment, { resource_type = "storage_account" }))
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = var.environment.location
  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"

  public_network_access           = "Enabled"
  allow_nested_items_to_be_public = true

  tags = var.tags
}

resource "azurerm_storage_account_static_website" "cdn_origin" {
  storage_account_id = azurerm_storage_account.cdn_origin.id
  index_document     = "index.html"
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
  value = azurerm_storage_account.cdn_origin.primary_web_host
}

output "dns_zone" {
  value = {
    name                = data.azurerm_dns_zone.integration_dx_pagopa_it.name
    resource_group_name = data.azurerm_dns_zone.integration_dx_pagopa_it.resource_group_name
  }
}

output "storage_account_id" {
  value = azurerm_storage_account.cdn_origin.id
}

output "cdn_profile_id" {
  value = azurerm_cdn_frontdoor_profile.this.id
}
