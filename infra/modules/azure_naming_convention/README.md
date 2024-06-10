# DX - Common Variables Validation

<!-- markdownlint-disable -->
<!-- BEGINNING OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
## Requirements

No requirements.

## Providers

No providers.

## Modules

No modules.

## Resources

No resources.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br>    prefix          = string<br>    env_short       = string<br>    location        = string<br>    domain          = optional(string)<br>    app_name        = string<br>    instance_number = string<br>  })</pre> | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_location_short"></a> [location\_short](#output\_location\_short) | n/a |
| <a name="output_project"></a> [project](#output\_project) | n/a |
| <a name="output_resource_name_prefix"></a> [resource\_name\_prefix](#output\_resource\_name\_prefix) | n/a |
<!-- END OF PRE-COMMIT-TERRAFORM DOCS HOOK -->
