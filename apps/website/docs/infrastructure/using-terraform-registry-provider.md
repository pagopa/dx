---
sidebar_position: 3
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
| `prefix`      | String | No       | Two-character project prefix.                           |
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

## Getting Support

For assistance with the DX Azure provider:

- Join the `#team_devex_help` channel for direct support.
- Provide specific error messages or logs when seeking help.
- Share your Terraform configuration and provider setup details.

The DX Azure provider is designed to simplify and standardize Azure resource
management. Don't hesitate to reach out for help as you integrate it into your
workflows.
