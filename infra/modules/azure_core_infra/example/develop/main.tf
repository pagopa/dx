variable "adopt_existing_apim_subnet" {
  type        = bool
  description = "Import the existing APIM subnet CIDR allocation during migration from the Azure API Management v4 module contract."
  default     = true
}

data "azurerm_subnet" "existing_apim" {
  count = var.adopt_existing_apim_subnet ? 1 : 0

  name = provider::dx::resource_name(merge({
    resource_type   = "apim_subnet",
    instance_number = 1,
  }, local.naming_config))
  virtual_network_name = module.core.common_vnet.name
  resource_group_name  = module.core.network_resource_group_name
}

moved {
  from = azurerm_subnet.apim
  to   = module.apim.azurerm_subnet.apim
}

import {
  for_each = var.adopt_existing_apim_subnet ? { apim = data.azurerm_subnet.existing_apim[0].id } : {}

  to = module.apim.dx_available_subnet_cidr.apim
  id = each.value
}

module "apim" {
  source  = "pagopa-dx/azure-api-management/azurerm"
  version = "~> 5.0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name
  use_case            = "development"

  publisher_email = "common-dx@pagopa.it"
  publisher_name  = "Common DX"

  virtual_network = module.core.common_vnet.id

  tags = local.tags
}

## Cosmos Account
module "cosmos" {
  source  = "pagopa-dx/azure-cosmos-account/azurerm"
  version = "~> 3.0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name
  use_case            = "development"

  subnet_pep_id = module.core.common_pep_snet.id

  private_dns_zone_resource_group_name = module.core.network_resource_group_name

  force_public_network_access_enabled = true

  consistency_policy = {
    consistency_preset = "Default"
  }

  alerts = {
    enabled = false
  }

  tags = local.tags
}

## Cosmos Database
resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "db"
  resource_group_name = module.cosmos.resource_group_name
  account_name        = module.cosmos.name
}

## Storage Account
module "storage_account" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "~> 6.0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name

  subnet_pep_id                        = module.core.common_pep_snet.id
  private_dns_zone_resource_group_name = module.core.network_resource_group_name
  force_public_network_access_enabled  = false

  use_case = "development"

  subservices_enabled = {
    blob  = true
    file  = false
    queue = false
    table = false
  }

  tags = local.tags
}
