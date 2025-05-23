# cloudfront

<!-- BEGIN_TF_DOCS -->
## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name | Type |
|------|------|
| [aws_cloudfront_cache_policy.cache_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_cache_policy) | resource |
| [aws_cloudfront_distribution.distribution](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution) | resource |
| [aws_cloudfront_function.host_header_function](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_function) | resource |
| [aws_cloudfront_origin_request_policy.origin_request_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_request_policy) | resource |
| [aws_cloudfront_response_headers_policy.response_headers_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_response_headers_policy) | resource |
| [aws_route53_record.website](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource |
| [aws_route53_record.www_website](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource |
| [aws_wafv2_web_acl.cloudfront](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl) | resource |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_custom_domain"></a> [custom\_domain](#input\_custom\_domain) | Custom domain information. | <pre>object({<br/>    domain_name         = string<br/>    hosted_zone_id      = string<br/>    acm_certificate_arn = string<br/>  })</pre> | `null` | no |
| <a name="input_custom_headers"></a> [custom\_headers](#input\_custom\_headers) | Custom headers to be added to the CloudFront distribution. | <pre>list(object({<br/>    header   = string<br/>    value    = string<br/>    override = optional(bool)<br/>  }))</pre> | `[]` | no |
| <a name="input_enable_waf"></a> [enable\_waf](#input\_enable\_waf) | Enable WAF for CloudFront distribution. | `bool` | `false` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    location        = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_origins"></a> [origins](#input\_origins) | n/a | <pre>object({<br/>    assets_bucket = object({<br/>      domain_name = string<br/>      oac         = string<br/>    })<br/>    server_function = object({<br/>      url = string<br/>      oac = string<br/>    })<br/>    image_optimization_function = object({<br/>      url = string<br/>      oac = string<br/>    })<br/>  })</pre> | n/a | yes |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_distribution_arn"></a> [distribution\_arn](#output\_distribution\_arn) | The ARN of the CloudFront distribution. |
| <a name="output_distribution_id"></a> [distribution\_id](#output\_distribution\_id) | The ID of the CloudFront distribution. |
| <a name="output_distribution_url"></a> [distribution\_url](#output\_distribution\_url) | The URL of the CloudFront distribution. |
<!-- END_TF_DOCS -->
