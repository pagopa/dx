# DX - AWS OpenNext Module

This Terraform module deploys a complete serverless infrastructure for Next.js applications on AWS using the [OpenNext](https://open-next.js.org/) framework. OpenNext is an open-source implementation that enables you to deploy Next.js applications to AWS with full support for SSG, SSR, ISR, and API routes using Lambda functions and CloudFront.

## 🚀 Features

- **Complete Next.js Support**: Full compatibility with Next.js features including SSG, SSR, ISR, and API routes
- **Serverless Architecture**: Built on AWS Lambda, S3, CloudFront, and DynamoDB for optimal performance and cost
- **Image Optimization**: Dedicated Lambda function for Next.js image optimization
- **Incremental Static Regeneration (ISR)**: Built-in support for ISR with DynamoDB caching
- **CloudFront Distribution**: Global CDN with optimized caching strategies
- **Custom Domain Support**: Easy setup with custom domains and SSL certificates
- **Preview Deployments**: Optional support for preview deployments [Under development]
- **WAF Protection**: Optional Web Application Firewall for enhanced security
- **Monitoring & Alarms**: Built-in CloudWatch alarms and monitoring
- **VPC Support**: Optional VPC deployment for private resources access

## 🏗️ Architecture

This module creates the following AWS resources:

```
                              ┌─────────────────┐
                              │   CloudFront    │
                              │  Distribution   │
                              └─────────┬───────┘
                                        │
                  ┌─────────────────────┼─────────────────────┐
                  │                     │                     │
          ┌───────▼───────┐    ┌────────▼────────┐    ┌───────▼───────┐
          │   S3 Bucket   │    │  Server Lambda  │    │Image Optimizer│
          │   (Assets)    │    │    Function     │    │    Lambda     │
          └───────────────┘    └─────────────────┘    └───────────────┘
                                        │
                              ┌─────────▼─────────┐
                              │   DynamoDB + S3   │
                              │    (ISR Cache)    │
                              └───────────────────┘
```

### Components

1. **Server Lambda**: Handles SSR, API routes, and dynamic content
2. **Image Optimizer Lambda**: Processes and optimizes images on-demand
3. **ISR Revalidation Lambda**: Manages incremental static regeneration
4. **Initializer Lambda**: Sets up initial DynamoDB configuration
5. **S3 Assets Bucket**: Stores static assets and cache
6. **CloudFront Distribution**: Global CDN with intelligent routing
7. **DynamoDB and S3**: Stores ISR tags and cache metadata

## 📋 Prerequisites

Before using this module, ensure you have:

1. **AWS Provider**: Configure the AWS provider with appropriate credentials
2. **OpenNext Build**: Your Next.js application must be built with OpenNext
3. **Domain & Certificate** (optional): ACM certificate and Route53 hosted zone for custom domains

## 📚 Examples

For complete examples, see the [examples/](./examples/) directory:

- [Basic deployment](./examples/basic/) - Minimal configuration

## 📊 Monitoring and Observability

When `enable_alarms` is set to `true`, the module creates CloudWatch alarms for:

- Lambda function errors
- Lambda function duration
- Lambda function throttles
- CloudFront error rates

## 🔒 Security Features

- **IAM Roles**: Least-privilege IAM roles for all Lambda functions
- **WAF Integration**: Optional Web Application Firewall protection
- **VPC Support**: Deploy Lambda functions in private subnets
- **HTTPS Only**: CloudFront enforces HTTPS redirects
- **Origin Access Control**: Secure S3 bucket access

## 💰 Cost Optimization

- **ARM64 Architecture**: Lambda functions use ARM64 for better price-performance
- **CloudFront Caching**: Aggressive caching reduces origin requests

```

---

<!-- markdownlint-disable -->
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
| <a name="input_alarms_actions"></a> [alarms\_actions](#input\_alarms\_actions) | List of actions to perform when an alarm is triggered. This can include SNS topics, Lambda functions, etc. If empty, no actions will be performed. | `list(string)` | `[]` | no |
| <a name="input_are_previews_enabled"></a> [are\_previews\_enabled](#input\_are\_previews\_enabled) | Whether to enable previews. This feature is still under development and should be used with caution. | `bool` | `false` | no |
| <a name="input_custom_domain"></a> [custom\_domain](#input\_custom\_domain) | Custom domain configuration. If not provided, the cloudfront default domain will be used. If the DNS zone is managed by AWS, the hosted\_zone\_id must be provided to create the Route53 record. | <pre>object({<br/>    domain_name         = string<br/>    acm_certificate_arn = string<br/>    hosted_zone_id      = optional(string, null)<br/>  })</pre> | `null` | no |
| <a name="input_custom_headers"></a> [custom\_headers](#input\_custom\_headers) | Custom headers to be added to the CloudFront distribution. | <pre>list(object({<br/>    header   = string<br/>    value    = string<br/>    override = optional(bool)<br/>  }))</pre> | `[]` | no |
| <a name="input_enable_alarms"></a> [enable\_alarms](#input\_enable\_alarms) | Whether to enable alarms for the lambda functions. | `bool` | `false` | no |
| <a name="input_enable_waf"></a> [enable\_waf](#input\_enable\_waf) | Whether to enable WAF for enhanced protection. | `bool` | `false` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Values which are used to generate resource names and region short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains. | <pre>object({<br/>    prefix          = string<br/>    env_short       = string<br/>    region          = string<br/>    domain          = optional(string)<br/>    app_name        = string<br/>    instance_number = string<br/>  })</pre> | n/a | yes |
| <a name="input_image_optimizer"></a> [image\_optimizer](#input\_image\_optimizer) | The image optimizer lambda function configuration. | <pre>object({<br/>    timeout               = optional(number, 30)<br/>    memory_size           = optional(number, 1024)<br/>    handler               = optional(string, "index.handler")<br/>    environment_variables = optional(map(string), {})<br/>  })</pre> | <pre>{<br/>  "environment_variables": {},<br/>  "handler": "index.handler",<br/>  "memory_size": 1024,<br/>  "timeout": 30<br/>}</pre> | no |
| <a name="input_initializer"></a> [initializer](#input\_initializer) | The initializer lambda function configuration. | <pre>object({<br/>    timeout               = optional(number, 900)<br/>    memory_size           = optional(number, 256)<br/>    handler               = optional(string, "index.handler")<br/>    environment_variables = optional(map(string), {})<br/>  })</pre> | <pre>{<br/>  "environment_variables": {},<br/>  "handler": "index.handler",<br/>  "memory_size": 256,<br/>  "timeout": 900<br/>}</pre> | no |
| <a name="input_isr_revalidation"></a> [isr\_revalidation](#input\_isr\_revalidation) | The ISR revalidation lambda function configuration. | <pre>object({<br/>    timeout               = optional(number, 30)<br/>    memory_size           = optional(number, 1024)<br/>    handler               = optional(string, "index.handler")<br/>    environment_variables = optional(map(string), {})<br/>  })</pre> | <pre>{<br/>  "environment_variables": {},<br/>  "handler": "index.handler",<br/>  "memory_size": 1024,<br/>  "timeout": 30<br/>}</pre> | no |
| <a name="input_node_major_version"></a> [node\_major\_version](#input\_node\_major\_version) | The major version of the runtime to use for the lambda function. Allowed values are 18, 20 or 22. | `string` | `"20"` | no |
| <a name="input_server"></a> [server](#input\_server) | The server lambda function configuration. | <pre>object({<br/>    timeout               = optional(number, 30)<br/>    memory_size           = optional(number, 1024)<br/>    handler               = optional(string, "index.handler")<br/>    environment_variables = optional(map(string), {})<br/>    is_streaming_enabled  = optional(bool, false)<br/>    lambda_layers         = optional(list(string), [])<br/>  })</pre> | <pre>{<br/>  "environment_variables": {},<br/>  "handler": "index.handler",<br/>  "is_streaming_enabled": false,<br/>  "memory_size": 1024,<br/>  "timeout": 30<br/>}</pre> | no |
| <a name="input_tags"></a> [tags](#input\_tags) | Resources tags | `map(any)` | n/a | yes |
| <a name="input_vpc"></a> [vpc](#input\_vpc) | The VPC used to deploy the lambda functions in. Configure this only when you want the lambda to access private resources contained in the VPC. | <pre>object({<br/>    id              = string<br/>    private_subnets = list(string)<br/>  })</pre> | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_assets"></a> [assets](#output\_assets) | The assets bucket. |
| <a name="output_cloudfront"></a> [cloudfront](#output\_cloudfront) | The CloudFront distribution. |
| <a name="output_common"></a> [common](#output\_common) | The common resources module. |
| <a name="output_image_optimizer"></a> [image\_optimizer](#output\_image\_optimizer) | The image optimizer lambda function. |
| <a name="output_initializer"></a> [initializer](#output\_initializer) | The initializer lambda function. |
| <a name="output_isr_revalidation"></a> [isr\_revalidation](#output\_isr\_revalidation) | The ISR revalidation lambda function. |
| <a name="output_server"></a> [server](#output\_server) | The server lambda function. |
<!-- END_TF_DOCS -->
```
