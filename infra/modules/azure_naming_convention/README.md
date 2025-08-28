# DX - Azure Naming Convention

![Terraform Module Downloads](https://img.shields.io/terraform/module/dm/pagopa-dx/azure-naming-convention/azurerm?logo=terraform&label=downloads&cacheSeconds=5000&link=https%3A%2F%2Fregistry.terraform.io%2Fmodules%2Fpagopa-dx%2Fazure-naming-convention%2Fazurerm%2Flatest)

This Terraform module provides a standardized naming convention for Azure resources. It ensures consistency and compliance with organizational naming standards.

## Features

- **Location Mapping**: Converts Azure region names (e.g., `italynorth`) into short codes (e.g., `itn`).
- **Flexible Domain Handling**: Supports optional domain names for resources shared across multiple domains.
- **Validation Rules**: Enforces strict validation for input variables to ensure naming consistency.

## Usage Example

Below is an example of how to use this module to generate standardized names for Azure resources:

```hcl
module "naming_convention" {
  source = "./modules/azure_naming_convention"

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "web"
    app_name        = "app"
    instance_number = "01"
  }
}

output "resource_name" {
  value = "${module.naming_convention.prefix}-example-${module.naming_convention.suffix}"
}
```

This configuration will generate a resource name like `dx-d-itn-web-app-example-01`.

## Diagram
<!-- START_TF_GRAPH -->
```mermaid
graph LR
```

<!-- END_TF_GRAPH -->

<!-- markdownlint-disable -->
<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

No modules.

## Resources

No resources.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_domain"></a> [domain](#output\_domain) | The domain segment used in the naming convention, derived from the environment's domain value or a default placeholder if not provided. |
| <a name="output_env_name"></a> [env\_name](#output\_env\_name) | The full name of the environment, derived from the short name provided in the environment configuration. Example: 'dev' for 'd'. |
| <a name="output_prefix"></a> [prefix](#output\_prefix) | The full prefix used in the naming convention for resources. It is composed of the environment prefix, environment short name, location short name, optionally the domain and app name. Example: 'dx-d-itn-[DOMAIN]-name'. |
| <a name="output_project"></a> [project](#output\_project) | The project identifier used in the naming convention, combining the environment prefix, environment short name, and location short name. Example: 'dx-d-itn'. |
| <a name="output_suffix"></a> [suffix](#output\_suffix) | The suffix used in the naming convention for resources, representing the instance number of the resource. Example: '01'. |
<!-- END_TF_DOCS -->
