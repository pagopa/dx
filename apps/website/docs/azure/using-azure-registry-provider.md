---
sidebar_position: 2
---

# Using DX Azure Terraform Provider

The DX Azure Terraform provider simplifies the creation and management of Azure
resources by enforcing standardized naming conventions and configurations. This
provider is maintained by the [PagoPA organization](https://github.com/pagopa)
and is available in the Terraform Registry under the namespace
[pagopa-dx](https://registry.terraform.io/namespaces/pagopa-dx).

:::note

This documentation is relevant for all individual contributors using the DX
Azure Terraform provider.

:::

## Why Use the DX Azure Provider?

The DX Azure provider offers several advantages for managing Azure resources:

- **Consistency**: Ensures resources follow a unified naming convention,
  reducing errors and improving maintainability.
- **Ease of Use**: Abstracts complex configurations into reusable functions,
  simplifying resource creation.
- **Integration**: Seamlessly integrates with Terraform workflows and pipelines,
  enabling efficient infrastructure management.

## Installation

To use the DX Azure provider, include it in your Terraform configuration as
follows:

```hcl
terraform {
  required_providers {
    dx = {
      source  = "pagopa-dx/azure"
      version = "~> 0.0"
    }
  }
}

provider "dx" {}
```

### Provider Configuration

The DX Azure provider accepts the following inputs (all currently optional):

| Name          | Type   | Required | Description                                             |
| ------------- | ------ | -------- | ------------------------------------------------------- |
| `prefix`      | String | No       | Project prefix (2-4 characters).                        |
| `environment` | String | No       | Deployment environment (d, u, or p).                    |
| `location`    | String | No       | Deployment location (itn/italynorth or weu/westeurope). |
| `domain`      | String | No       | Optional domain for naming.                             |

## Functions

The DX Azure provider includes a `resource_name` function to generate
standardized resource names.

### resource_name Function

Generates a resource name based on the standardized prefix and additional
parameters.

#### Inputs

| Name              | Type    | Required | Description                                                                                                                                                                                                       |
| ----------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prefix`          | String  | Yes      | Prefix that defines the repository domain.                                                                                                                                                                        |
| `environment`     | String  | Yes      | Deployment environment (d, u, or p).                                                                                                                                                                              |
| `location`        | String  | Yes      | Deployment location (itn, weu, italynorth or westeurope).                                                                                                                                                         |
| `domain`          | String  | No       | Optional value specifying the domain.                                                                                                                                                                             |
| `name`            | String  | Yes      | Name of the resource.                                                                                                                                                                                             |
| `resource_type`   | String  | Yes      | Type of the resource. The list of supported resource types can be found in the [documentation table](https://registry.terraform.io/providers/pagopa-dx/azure/latest/docs/functions/resource_name#resource-types). |
| `instance_number` | Integer | Yes      | Instance number of the resource.                                                                                                                                                                                  |

#### Example

```hcl
output "resource_name" {
  value = provider::dx::resource_name({
    prefix = "dx",
    environment = "d",
    location = "itn",
    domain = "test",
    name = "app",
    resource_type = "api_management",
    instance_number = 1,
  })
}
```

**Output**: `dx-d-itn-app-apim-pep-01`

:::note

To call a function, use the syntax:
`provider::PROVIDER_NAME::FUNCTION_NAME(...)`.

:::

## Resources

The DX Azure provider includes resources to simplify infrastructure management
and automate common tasks.

### dx_available_subnet_cidr Resource

The `dx_available_subnet_cidr` resource automatically finds an available CIDR
block for a new subnet within a specified Azure Virtual Network. This resource
analyzes existing subnets and allocates a non-overlapping CIDR block, making it
easier to manage subnet creation without manual CIDR calculations.

#### Inputs

| Name                 | Type    | Required | Description                                                                                                                                                                         |
| -------------------- | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `virtual_network_id` | String  | Yes      | The Azure Resource ID of the Virtual Network (format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/virtualNetworks/{vnetName}`). |
| `prefix_length`      | Integer | Yes      | The desired prefix length for the new subnet CIDR (e.g., 24 for /24). Must be larger than the VNet prefix and smaller or equal to 29.                                               |

#### Outputs

| Name         | Type   | Description                           |
| ------------ | ------ | ------------------------------------- |
| `id`         | String | A unique identifier for the resource. |
| `cidr_block` | String | The allocated available CIDR block.   |

#### Example

```hcl
resource "dx_available_subnet_cidr" "next_cidr" {
  virtual_network_id = azurerm_virtual_network.example.id
  prefix_length      = 24  # For a /24 subnet
}

resource "azurerm_subnet" "new_subnet" {
  name                 = "example-subnet"
  resource_group_name  = azurerm_resource_group.example.name
  virtual_network_name = azurerm_virtual_network.example.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr.cidr_block]
}
```

:::tip

When creating multiple subnets, use `depends_on` to ensure CIDR blocks are
allocated sequentially and prevent overlaps:

```hcl
resource "dx_available_subnet_cidr" "next_cidr_1" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 24
}

resource "azurerm_subnet" "new_subnet_1" {
  name                 = "my-new-subnet-1"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr_1.cidr_block]
}

resource "dx_available_subnet_cidr" "next_cidr_2" {
  virtual_network_id = azurerm_virtual_network.this.id
  prefix_length      = 29

  depends_on = [azurerm_subnet.new_subnet_1]
}

resource "azurerm_subnet" "new_subnet_2" {
  name                 = "my-new-subnet-2"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [dx_available_subnet_cidr.next_cidr_2.cidr_block]
}
```

:::

:::note

The `dx_available_subnet_cidr` resource is a virtual resource that doesn't
create an actual Azure resource. It only calculates and reserves a CIDR block in
your Terraform state. Changing either `virtual_network_id` or `prefix_length`
after creation requires recreating the resource.

:::

## Semantic Versioning

The DX Azure provider follows [semantic versioning](https://semver.org/), which
ensures compatibility and stability across updates. When specifying the provider
version in your Terraform configuration, use the `~>` operator to allow updates
within the same major version:

```hcl
version = "~> 0.0"
```

This ensures that breaking changes are avoided while allowing minor updates and
patches. For example:

- `~> 0.0` allows updates to `0.x.x` but not `1.0.0`.

When publishing a new release, ensure the version tag starts with a `v` (e.g.,
`v0.1.0`) as required by the
[Terraform Registry](https://developer.hashicorp.com/terraform/registry/providers/publishing#creating-a-github-release).
