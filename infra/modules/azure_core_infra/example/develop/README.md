# Example: Development Environment

This example demonstrates how to deploy a development environment using the `pagopa/dx-azure-core-infra/azurerm` module along with additional resources tailored for developer use.

## Overview

The configuration in this example:

- Deploys core infrastructure components via the `dx-azure-core-infra` module.
- Creates an Azure API Management service.
- Provisions an Azure Cosmos DB account with a database.
- Deploys an Azure Storage Account.

## Infrastructure Components

### API Management

This module provisions an Azure API Management service with a subnet in the core virtual network.

```hcl
resource "azurerm_subnet" "apim" {
  name                 = "${module.naming_convention.project}-apim-snet-${local.environment.instance_number}"
  virtual_network_name = module.core.common_vnet.name
  resource_group_name  = module.core.network_resource_group_name
  address_prefixes     = ["10.60.2.0/24"]
}

module "apim" {
  source  = "pagopa/dx-azure-api-management/azurerm"
  version = "~> 0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name
  tier                = "s"

  publisher_email = "common-dx@pagopa.it"
  publisher_name  = "Common DX"

  virtual_network = {
    name                = module.core.common_vnet.name
    resource_group_name = module.core.network_resource_group_name
  }

  subnet_id                     = azurerm_subnet.apim.id
  virtual_network_type_internal = true
  enable_public_network_access  = true

  tags = local.tags
}
```

In this example tier is setted to "s", but is possible to choose between "s", "m" or "l" (Check [here](https://registry.terraform.io/modules/pagopa/dx-azure-api-management/azurerm/latest) how configure it).

### Cosmos DB

This module provisions an Azure Cosmos DB account and a database.

```hcl
module "cosmos" {
  source  = "pagopa/dx-azure-cosmos-account/azurerm"
  version = "~> 0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name

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

resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "db"
  resource_group_name = module.cosmos.resource_group_name
  account_name        = module.cosmos.name
}
```

Check [here](https://registry.terraform.io/modules/pagopa/dx-azure-cosmos-account/azurerm/latest) for a more specific configuration.

### Storage Account

This module provisions an Azure Storage Account with only Blob Storage enabled.

```hcl
module "storage_account" {
  source  = "pagopa/dx-azure-storage-account/azurerm"
  version = "~> 0"

  environment         = local.environment
  resource_group_name = module.core.test_resource_group_name

  subnet_pep_id                       = module.core.common_pep_snet.id
  force_public_network_access_enabled = true

  tier = "s"

  subservices_enabled = {
    blob  = true
    file  = false
    queue = false
    table = false
  }

  tags = local.tags
}
```

In this example tier is setted to "s", but is possible to choose between "s" or "l" (Check [here](https://registry.terraform.io/modules/pagopa/dx-azure-storage-account/azurerm/latest) for a more specific configuration).

## Note

If you are working in another project within the same subscription where the core infrastructure has already been deployed, you can reference the existing resources using data sources. For example:

```hcl
data "azurerm_resource_group" "test_rg" {
  name = "${module.naming_convention.project}-test-rg-01"
}

data "azurerm_resource_group" "net_rg" {
  name = "${module.naming_convention.project}-network-rg-01"
}

data "azurerm_resource_group" "common_rg" {
  name = "${module.naming_convention.project}-common-rg-01"
}

data "azurerm_virtual_network" "test_vnet" {
  name                = "${module.naming_convention.project}-common-vnet-01"
  resource_group_name = data.azurerm_resource_group.net_rg.name
}

data "azurerm_subnet" "pep_snet" {
  name                 = "${module.naming_convention.project}-pep-snet-01"
  virtual_network_name = data.azurerm_virtual_network.test_vnet.name
  resource_group_name  = data.azurerm_virtual_network.test_vnet.resource_group_name
}

data "azurerm_key_vault" "common_kv" {
  name                = "${module.naming_convention.project}-common-kv-01"
  resource_group_name = data.azurerm_resource_group.common_rg.name
}

```

Then, in different modules, you can use these data sources as follows:

```hcl
  ...

  resource_group_name = data.azurerm_resource_group.test_rg.name

  ...

  subnet_pep_id = data.azurerm_subnet.pep_snet.id

  ...

  virtual_network = {
    name                = data.azurerm_virtual_network.test_vnet.name
    resource_group_name = data.azurerm_resource_group.net_rg.name
  }
  
  ...

```


<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_azurerm"></a> [azurerm](#requirement\_azurerm) | <= 4.10.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_apim"></a> [apim](#module\_apim) | pagopa/dx-azure-api-management/azurerm | ~> 0 |
| <a name="module_core"></a> [core](#module\_core) | ../.. | n/a |
| <a name="module_cosmos"></a> [cosmos](#module\_cosmos) | pagopa/dx-azure-cosmos-account/azurerm | ~> 0 |
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | pagopa/dx-azure-naming-convention/azurerm | ~> 0 |
| <a name="module_storage_account"></a> [storage\_account](#module\_storage\_account) | pagopa/dx-azure-storage-account/azurerm | ~> 0 |

## Resources

| Name | Type |
|------|------|
| [azurerm_cosmosdb_sql_database.db](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_sql_database) | resource |
| [azurerm_subnet.apim](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet) | resource |

## Inputs

No inputs.

## Outputs

No outputs.
<!-- END_TF_DOCS -->
