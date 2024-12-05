# DX - Common Variables Validation

This module generates output values that follow the naming conventions used in DX. It takes the following inputs:

- `prefix`: The prefix for the naming convention (e.g., io, dx, ...).
- `env_short`: A short identifier for the environment (e.g., “d”, "p", "u").
- `location`: The Azure region or location (e.g. italynorth, westeurope, ...).
- `domain`: (Optional) The domain name to include in the naming convention.
- `app_name`: The application name or identifier.
- `instance_number`: The instance number (e.g., “01”).

Based on these inputs, the module generates the following output values:

- `prefix`: A concatenation of the prefix, env_short, and location_short values, with domain included if provided. The format is:
`prefix-env_short-location_short-domain` (e.g. `dx-d-itn-test` if domain is test).
- `suffix`: The value of `instance_number`.
- `project`: A combination of prefix, env_short, and location_short values. The format is:
`prefix-env_short-location_short`.
- `names`: A map where the keys represent the resource types, and the values are the corresponding resource names, generated with the format:
`prefix-abbreviation-suffix`. The abbreviation is retrieved from the `local.resource_abbreviations` mapping.
  e.g.

  ```hcl
  {
    "app_service": "dx-d-itn-test-app-01",
    "blob_storage": "dx-d-itn-test-blob-01",
    "cosmos": "dx-d-itn-test-conmo-01",
    "virtual_network": "dx-d-itn-test-vnet-01"
  }
  ```

This module streamlines the process of generating consistent resource names based on a predefined naming structure, ensuring alignment with DX standards.

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
| <a name="output_names"></a> [names](#output\_names) | n/a |
| <a name="output_prefix"></a> [prefix](#output\_prefix) | n/a |
| <a name="output_project"></a> [project](#output\_project) | n/a |
| <a name="output_suffix"></a> [suffix](#output\_suffix) | n/a |
<!-- END_TF_DOCS -->
