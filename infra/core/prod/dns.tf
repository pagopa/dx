resource "azurerm_dns_zone" "dx_pagopa_it" {
  name                = "dx.pagopa.it"
  resource_group_name = module.core.network_resource_group_name
}
