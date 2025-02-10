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

The API Management service is deployed in a dedicated subnet within the core virtual network. It supports internal access via private networking and allows public access when required.

For detailed configuration options, refer to the [Terraform module documentation](https://registry.terraform.io/modules/pagopa/dx-azure-api-management/azurerm/latest).

### Cosmos DB

An Azure Cosmos DB account is provisioned with a SQL database to store application data.

For detailed configuration options, refer to the [Terraform module documentation](https://registry.terraform.io/modules/pagopa/dx-azure-cosmos-account/azurerm/latest).

### Storage Account

An Azure Storage Account is created with a specific focus on Blob Storage. 

For detailed configuration options, refer to the [Terraform module documentation](https://registry.terraform.io/modules/pagopa/dx-azure-storage-account/azurerm/latest).

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
| <a name="module_apim"></a> [apim](#module\_apim) | ../../../azure_api_management | n/a |
| <a name="module_core"></a> [core](#module\_core) | ../.. | n/a |
| <a name="module_cosmos"></a> [cosmos](#module\_cosmos) | ../../../azure_cosmos_account | n/a |
| <a name="module_naming_convention"></a> [naming\_convention](#module\_naming\_convention) | pagopa/dx-azure-naming-convention/azurerm | ~> 0 |
| <a name="module_storage_account"></a> [storage\_account](#module\_storage\_account) | ../../../azure_storage_account | n/a |

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
