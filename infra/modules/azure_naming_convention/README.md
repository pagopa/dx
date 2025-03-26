# DX - Azure Naming Convention

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
| <a name="output_domain"></a> [domain](#output\_domain) | n/a |
| <a name="output_env_name"></a> [env\_name](#output\_env\_name) | n/a |
| <a name="output_prefix"></a> [prefix](#output\_prefix) | n/a |
| <a name="output_project"></a> [project](#output\_project) | n/a |
| <a name="output_suffix"></a> [suffix](#output\_suffix) | n/a |
<!-- END_TF_DOCS -->
