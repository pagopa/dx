terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.110, < 5.0"
    }
  }
}

module "naming_convention" {
  source = "../../../azure_naming_convention"

  environment = {
    prefix          = var.environment.prefix
    env_short       = var.environment.env_short
    location        = var.environment.location
    domain          = var.environment.domain
    app_name        = var.environment.app_name
    instance_number = var.environment.instance_number
  }
}

resource "azurerm_subnet" "snet" {
  name                 = "${module.naming_convention.prefix}-snet-sa-${module.naming_convention.suffix}"
  virtual_network_name = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name  = "${module.naming_convention.project}-network-rg-01"
  address_prefixes     = ["10.50.200.0/24"]
}

data "azurerm_subnet" "pep" {
  name                 = "${module.naming_convention.project}-pep-snet-01"
  virtual_network_name = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name  = "${module.naming_convention.project}-network-rg-01"
}

data "azurerm_resource_group" "rg" {
  name = "${var.environment.prefix}-${var.environment.env_short}-itn-test-rg-${module.naming_convention.suffix}"

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
  value = azurerm_subnet.snet.id
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