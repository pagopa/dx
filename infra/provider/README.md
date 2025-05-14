<p align="center">
    <img src="https://raw.githubusercontent.com/pagopa/.github/5ef0e41abf2d0b07d6b3ab62cc5cfda34c38822a/profile/logo.svg" width="180" height="50">
</p>

<hr>

# DX - Terraform Provider Azure

The **azure** Terraform provider is for Developer Experience, simplifies the creation and management of Azure resources following standardized naming conventions. This provider is maintained by the [PagoPA organization](https://github.com/pagopa) and is available at [terraform-provider-azure](https://github.com/pagopa-dx/terraform-provider-azure).

## Installation

To configure the provider, execute the following commands in the main directory of the repository:

```bash
go mod init github.com/pagopa-dx/terraform-provider-azure
go mod tidy
go build -o terraform-provider-azure
```

To configure the docs follow this documentation for [docs format](https://developer.hashicorp.com/terraform/registry/providers/docs) and [go generate](https://developer.hashicorp.com/terraform/tutorials/providers-plugin-framework/providers-plugin-framework-documentation-generation)

```bash
cd tools
go mod init tools
go mod tidy
go generate
```

> [!NOTE]  
> If `go generate` return error for DataSource/Resource name, rename temporarly metadata to match name and re execute command

## Usage

### Required Provider Configuration

To use the azure provider in your Terraform configuration, include the following block:

```hcl
terraform {
  required_providers {
    dx = {
      source = "pagopa-dx/azure"
    }
  }
}

provider "dx" {
  prefix      = "<project_prefix>" # e.g., "dx", "io"
  environment = "<environment>"    # d, u, or p (dev, uat, or prod)
  location    = "<location>"       # itn/italynorth or weu/westeurope
}
```

**Inputs:**

|Name|Type|Required|Description|
|:---|:---:|:---:|:---|
|prefix|String|No|Two-character project prefix.|
|environment|String|No|Deployment environment (d, u, or p).|
|location|String|No|Deployment location (itn/italynorth or weu/westeurope).|
|domain|String|No|Optional domain for naming.|

## Resources

### dx_available_subnet_cidr

Find an available CIDR block for a new subnet within a specified Azure Virtual Network.

**Inputs:**

|Name|Type|Required|Description|
|:---|:---:|:---:|:---|
|virtual_network_id|String|Yes|The ID of the Azure Virtual Network resource where to allocate a CIDR block.|
|prefix_length|Integer|Yes|The desired prefix length for the new CIDR block (e.g., 24 for a /24 subnet).|

**Attributes:**

|Name|Type|Description|
|:---|:---:|:---|
|id|String|Unique identifier for the allocated CIDR block.|
|cidr_block|String|The allocated CIDR block that can be used for subnet creation.|

**Example:**

```hcl
resource "dx_available_subnet_cidr" "next_cidr" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 24  # For a /24 subnet
}

resource "azurerm_subnet" "new_subnet" {
  name                 = "my-new-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr.cidr_block]
}
```

When creating multiple subnets, it is necessary to use `depends_on` to prevent CIDR block overlaps:

```hcl
resource "dx_available_subnet_cidr" "next_cidr_1" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 24
}

resource "azurerm_subnet" "new_subnet_1" {
  name                 = "my-new-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr_1.cidr_block]
}

resource "dx_available_subnet_cidr" "next_cidr_2" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 29

  # Ensures the first CIDR block is allocated before finding the next one
  depends_on = [
    azurerm_subnet.new_subnet_1
  ]
}

resource "azurerm_subnet" "new_subnet_2" {
  name                 = "my-new-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr_2.cidr_block]
}
```

## Functions

### resource_name

Generates a resource name based on the standardized prefix and additional parameters.

**Inputs:**

|Name|Type|Required|Description|
|:---|:---:|:---:|:---|
|prefix|String|Yes|Prefix that define the repository domain (Max 2 characters).|
|environment|String|Yes|Environment where the resources will be deployed (d, u or p).|
|location|String|Yes|Location where the resources will be deployed (itn/italynorth or weu/westeurope).|
|domain|String|No|Optional value that specify the domain.|
|resource|String|Yes|Name of the resource.|
|type|String|Yes|Type of the resource (see table).|
|instance|Integer|Yes|Instance number of the resource.|

**Example:**

```hcl
output "resource_name" {
  value = provider::dx::resource_name({
    prefix = "dx",
    environment = "d",
    location = "itn",
    domain = "test",
    name = "app",
    resource_type = "blob_private_endpoint",
    instance_number = 1,
  })
}
```

- **Output**: dx-d-itn-app-blob-pep-01

> [!NOTE]  
> Remember that to call a function is needed the path provider::PROVIDER_NAME::FUNCTION_NAME(...)

**Resource Types:**

The following table lists the resource types and their abbreviations used in the resource_name function:

|Type|Abbreviation|
|:---|:---:|
|ai_search|srch|
|api_management|apim|
|api_management_autoscale|apim-as|
|apim_network_security_group|apim-nsg|
|apim_subnet|apim-snet|
|app_gateway|agw|
|app_private_endpoint|app-pep|
|app_service|app|
|app_service_plan|asp|
|app_slot_private_endpoint|staging-app-pep|
|app_subnet|app-snet|
|application_insights|appi|
|blob_private_endpoint|blob-pep|
|blob_storage|blob|
|cdn_frontdoor_endpoint|fde|
|cdn_frontdoor_origin|fdo|
|cdn_frontdoor_origin_group|fdog|
|cdn_frontdoor_profile|afd|
|cdn_frontdoor_route|cdnr|
|cdn_monitor_diagnostic_setting|cdnp|
|container_app|ca|
|container_app_environment|cae|
|container_app_job|caj|
|container_app_private_endpoint|cae-pep|
|container_app_subnet|cae-snet|
|cosmos_db|cosmos|
|cosmos_db_nosql|cosno|
|cosmos_private_endpoint|cosno-pep|
|customer_key_storage_account|stcmk|
|durable_function_storage_account|stfd|
|eventhub_namespace|evhns|
|eventhub_private_endpoint|evhns-pep|
|file_private_endpoint|file-pep|
|file_storage|file|
|function_app|func|
|function_private_endpoint|func-pep|
|function_slot_private_endpoint|staging-func-pep|
|function_storage_account|stfn|
|function_subnet|func-snet|
|key_vault|kv|
|key_vault_private_endpoint|kv-pep|
|load_testing|lt|
|log_analytics|log|
|managed_identity|id|
|nat_gateway|ng|
|network_security_group|nsg|
|postgre_endpoint|psql-ep|
|postgre_private_endpoint|psql-pep|
|postgre_replica_private_endpoint|psql-pep-replica|
|postgresql|psql|
|postgresql_replica|psql-replica|
|private_endpoint|pep|
|private_endpoint_subnet|pep-snet|
|public_ip|pip|
|queue_private_endpoint|queue-pep|
|queue_storage|queue|
|redis_cache|redis|
|resource_group|rg|
|servicebus_namespace|sbns|
|servicebus_private_endpoint|sbns-pep|
|static_web_app|stapp|
|storage_account|st|
|subnet|snet|
|table_private_endpoint|table-pep|
|table_storage|table|
|virtual_machine|vm|
|virtual_network|vnet|

## Example Configuration

```hcl
terraform {
  required_providers {
    dx = {
      source  = "pagopa-dx/azure"
    }
  }
}

provider "dx" {}

output "resource_name" {
  value = provider::dx::resource_name({
    prefix = "dx",
    environment = "d",
    location = "itn",
    domain = "test",
    name = "app",
    resource_type = "blob_private_endpoint",
    instance_number = 1,
  })
}
````

**Result**: dx-d-itn-app-blob-pep-01

<hr>

<p align="center">
    PagoPA S.p.A. <br>
    <a href="https://www.pagopa.it/">Web Site</a> | <a href="https://github.com/pagopa">Official GitHub</a> | <a href="https://twitter.com/pagopa">Twitter</a> | <a href="https://www.linkedin.com/company/pagopa/">Linkedin</a> | <a href="https://www.youtube.com/channel/UCFBGOEJUPQ6t3xtZFc_UIEQ">YouTube</a> | <a href="https://www.instagram.com/pagopaspa/">Instagram</a>
</p>

<hr>