# DX - Common Variables Validation

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
| <a name="input_resource_type"></a> [resource\_type](#input\_resource\_type) | The type of the Azure resource (e.g., 'App Service', 'Function App', 'Event Hub', ... ). | `string` | `"None"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_domain"></a> [domain](#output\_domain) | n/a |
| <a name="output_name"></a> [name](#output\_name) | n/a |
| <a name="output_prefix"></a> [prefix](#output\_prefix) | n/a |
| <a name="output_project"></a> [project](#output\_project) | n/a |
| <a name="output_suffix"></a> [suffix](#output\_suffix) | n/a |
<!-- END_TF_DOCS -->
