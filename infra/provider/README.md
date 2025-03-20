<p align="center">
    <img src="https://raw.githubusercontent.com/pagopa/.github/5ef0e41abf2d0b07d6b3ab62cc5cfda34c38822a/profile/logo.svg" width="180" height="50">
</p>

<hr>

# terraform-provider-azure

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
  location    = "<location>"       # itn (Italy North) or weu (West Europe)
}
```

**Inputs:**

|Name|Type|Required|Description|
|:---|:---:|:---:|:---|
|prefix|String|No|Two-character project prefix.|
|environment|String|No|Deployment environment (d, u, or p).|
|location|String|No|Deployment location (itn or weu).|
|domain|String|No|Optional domain for naming.|

## Functions

### resource_name

Generates a resource name based on the standardized prefix and additional parameters.

**Inputs:**

|Name|Type|Required|Description|
|:---|:---:|:---:|:---|
|prefix|String|Yes|Prefix that define the repository domain (Max 2 characters).|
|environment|String|Yes|Environment where the resources will be deployed (d, u or p).|
|location|String|Yes|Location where the resources will be deployed (itn or weu).|
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
|virtual_machine|vm|
|container_app_job|caj|
|storage_account|st|
|blob_storage|blob|
|queue_storage|queue|
|table_storage|table|
|file_storage|file|
|function_storage_account|stfn|
|api_management|apim|
|api_management_autoscale|apim-as|
|virtual_network|vnet|
|network_security_group|nsg|
|apim_network_security_group|apim-nsg|
|app_gateway|agw|
|cosmos_private_endpoint|cosno-pep|
|postgre_private_endpoint|psql-pep|
|blob_private_endpoint|blob-pep|
|queue_private_endpoint|queue-pep|
|file_private_endpoint|file-pep|
|table_private_endpoint|table-pep|
|eventhub_private_endpoint|evhns-pep|
|app_subnet|app-snet|
|apim_subnet|apim-snet|
|function_subnet|func-snet|
|cosmos_db|cosmos|
|cosmos_db_nosql|cosno|
|postgresql|psql|
|postgresq_replica|psql-replica|
|eventhub_namespace|evhns|
|function_app|func|
|app_service|app|
|app_service_plan|asp|
|key_vault|kv|
|application_insights|appi|
|resource_group|rg|

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