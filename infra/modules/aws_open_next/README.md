# aws_open_next

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 5.0 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_assets"></a> [assets](#module\_assets) | ./modules/assets | n/a |
| <a name="module_cloudfront"></a> [cloudfront](#module\_cloudfront) | ./modules/cloudfront | n/a |
| <a name="module_common"></a> [common](#module\_common) | ./modules/common | n/a |
| <a name="module_image_optimizer"></a> [image\_optimizer](#module\_image\_optimizer) | ./modules/image_optimizer_lambda | n/a |
| <a name="module_initializer"></a> [initializer](#module\_initializer) | ./modules/initialization_lambda | n/a |
| <a name="module_isr_revalidation"></a> [isr\_revalidation](#module\_isr\_revalidation) | ./modules/isr_revalidation | n/a |
| <a name="module_server"></a> [server](#module\_server) | ./modules/server_lambda | n/a |

## Resources

No resources.

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_are_previews_enabled"></a> [are\_previews\_enabled](#input\_are\_previews\_enabled) | Whether to enable previews. | `bool` | `false` | no |
| <a name="input_custom_domain"></a> [custom\_domain](#input\_custom\_domain) | Custom domain configuration. If not provided, the cloudfront default domain will be used. If the DNS zone is managed by AWS, the hosted\_zone\_id must be provided to create the Route53 record. | <pre>object({<br/>    domain_name         = string<br/>    acm_certificate_arn = string<br/>    hosted_zone_id      = optional(string, null)<br/>  })</pre> | `null` | no |
| <a name="input_custom_headers"></a> [custom\_headers](#input\_custom\_headers) | Custom headers to be added to the CloudFront distribution. | <pre>list(object({<br/>    header   = string<br/>    value    = string<br/>    override = optional(bool)<br/>  }))</pre> | `[]` | no |
| <a name="input_enable_waf"></a> [enable\_waf](#input\_enable\_waf) | Whether to enable WAF for enhanced protection. | `bool` | `false` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_image_optimizer"></a> [image\_optimizer](#input\_image\_optimizer) | The image optimizer lambda function configuration. | <pre>object({<br/>    timeout               = optional(number, 30)<br/>    memory_size           = optional(number, 1024)<br/>    handler               = optional(string, "index.handler")<br/>    environment_variables = optional(map(string), {})<br/>  })</pre> | <pre>{<br/>  "environment_variables": {},<br/>  "handler": "index.handler",<br/>  "memory_size": 1024,<br/>  "timeout": 30<br/>}</pre> | no |
| <a name="input_initializer"></a> [initializer](#input\_initializer) | The initializer lambda function configuration. | <pre>object({<br/>    timeout               = optional(number, 900)<br/>    memory_size           = optional(number, 256)<br/>    handler               = optional(string, "index.handler")<br/>    environment_variables = optional(map(string), {})<br/>  })</pre> | <pre>{<br/>  "environment_variables": {},<br/>  "handler": "index.handler",<br/>  "memory_size": 256,<br/>  "timeout": 900<br/>}</pre> | no |
| <a name="input_node_major_version"></a> [node\_major\_version](#input\_node\_major\_version) | The major version of the runtime to use for the lambda function. Allowed values are 18, 20 or 22. | `string` | `"20"` | no |
| <a name="input_server"></a> [server](#input\_server) | The server lambda function configuration. | <pre>object({<br/>    timeout               = optional(number, 30)<br/>    memory_size           = optional(number, 1024)<br/>    handler               = optional(string, "index.handler")<br/>    environment_variables = optional(map(string), {})<br/>    is_streaming_enabled  = optional(bool, false)<br/>  })</pre> | <pre>{<br/>  "environment_variables": {},<br/>  "handler": "index.handler",<br/>  "is_streaming_enabled": false,<br/>  "memory_size": 1024,<br/>  "timeout": 30<br/>}</pre> | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_vpc"></a> [vpc](#input\_vpc) | The VPC used to deploy the lambda functions in. Configure this only when you want the lambda to access private resources contained in the VPC. | <pre>object({<br/>    id              = string<br/>    private_subnets = list(string)<br/>  })</pre> | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_assets"></a> [assets](#output\_assets) | The assets bucket. |
| <a name="output_cloudfront"></a> [cloudfront](#output\_cloudfront) | The CloudFront distribution. |
| <a name="output_image_optimizer"></a> [image\_optimizer](#output\_image\_optimizer) | The image optimizer lambda function. |
| <a name="output_isr_revalidation"></a> [isr\_revalidation](#output\_isr\_revalidation) | The ISR revalidation lambda function. |
| <a name="output_server"></a> [server](#output\_server) | The server lambda function. |
<!-- END_TF_DOCS -->
