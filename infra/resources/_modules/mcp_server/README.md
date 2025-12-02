# mcp_server

Terraform module for deploying an MCP (Model Context Protocol) server with both HTTP API Gateway v2 and REST API Gateway for blue-green deployment strategy.

## Architecture Overview

This module deploys:

- **Lambda function** running the MCP server (shared by both APIs)
- **HTTP API Gateway v2** (existing, no WAF support)
- **REST API Gateway** (new, with WAF protection)
- **AWS WAF** protecting the REST API
- **Custom domains** for both APIs
- **S3 bucket** for knowledge base storage
- **CloudWatch** logs and metrics

## Blue-Green Deployment Strategy

The module maintains **two parallel API Gateway deployments**:

### Blue (HTTP API v2)

- Existing deployment
- Custom domain: `var.dns.custom_domain_name`
- No WAF support (API Gateway HTTP v2 limitation)
- Lower latency, simpler configuration

### Green (REST API)

- New deployment with WAF protection
- Custom domain: `var.dns.custom_domain_name_rest`
- Full WAF support with:
  - IP-based rate limiting (configurable via `var.waf_rate_limit_per_ip`)
  - AWS Managed Core Rule Set
  - Known Bad Inputs protection
  - Bot Control (COMMON level)
- X-Ray tracing enabled
- Detailed CloudWatch metrics

### Migration Path

1. **Deploy both APIs in parallel** - Apply this module
2. **Test REST API** - Validate functionality and performance at `custom_domain_name_rest`
3. **Switch DNS** - Update your DNS to point to REST API when ready
4. **Monitor** - Compare metrics between both APIs
5. **Rollback option** - Keep HTTP API v2 as fallback
6. **Cleanup** - Remove HTTP API v2 resources once REST API is stable

### Outputs

The module provides outputs for both deployments:

- `http_api_endpoint`, `http_api_custom_domain` - HTTP API v2 info
- `rest_api_endpoint`, `rest_api_custom_domain` - REST API info
- `waf_web_acl_id`, `waf_web_acl_arn` - WAF configuration

## WAF Configuration

The WAF includes the following rules (in priority order):

1. **Rate Limiting** (Priority 0)
   - Blocks IPs exceeding `var.waf_rate_limit_per_ip` requests in 5 minutes
   - Scoped to `/mcp` path

2. **AWS Core Rule Set** (Priority 1)
   - Protection against OWASP Top 10 vulnerabilities
   - SQL injection, XSS, LFI, RFI protection

3. **Known Bad Inputs** (Priority 2)
   - Blocks requests with known malicious patterns
   - Invalid or malformed requests

4. **Bot Control** (Priority 3)
   - Detects and blocks automated bots
   - COMMON inspection level (upgrade to TARGETED for advanced protection)

All WAF logs are sent to CloudWatch: `/aws/wafv2/{prefix}-{environment}-mcp-api`

<!-- BEGIN_TF_DOCS -->

## Requirements

No requirements.

## Modules

No modules.

## Resources

| Name                                                                                                                                                                                                | Type     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| [aws_acm_certificate.api_custom_domain](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate)                                                                | resource |
| [aws_acm_certificate_validation.api_custom_domain](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation)                                          | resource |
| [aws_api_gateway_account.main](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_account)                                                                     | resource |
| [aws_api_gateway_base_path_mapping.mcp_server](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_base_path_mapping)                                           | resource |
| [aws_api_gateway_deployment.mcp_server](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment)                                                         | resource |
| [aws_api_gateway_domain_name.mcp_server](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_domain_name)                                                       | resource |
| [aws_api_gateway_integration.lambda_proxy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration)                                                     | resource |
| [aws_api_gateway_integration.lambda_root](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration)                                                      | resource |
| [aws_api_gateway_method.proxy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method)                                                                      | resource |
| [aws_api_gateway_method.proxy_root](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method)                                                                 | resource |
| [aws_api_gateway_method_settings.all](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_method_settings)                                                      | resource |
| [aws_api_gateway_resource.proxy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_resource)                                                                  | resource |
| [aws_api_gateway_rest_api.mcp_server](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_rest_api)                                                             | resource |
| [aws_api_gateway_stage.prod](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage)                                                                         | resource |
| [aws_cloudwatch_log_group.api_gateway_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group)                                                       | resource |
| [aws_ecr_repository.server](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository)                                                                             | resource |
| [aws_iam_policy.bedrock_llms_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy)                                                                        | resource |
| [aws_iam_policy.kb_data_sources_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy)                                                                     | resource |
| [aws_iam_policy.kb_vector_store_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy)                                                                     | resource |
| [aws_iam_policy.lambda_bedrock_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy)                                                                      | resource |
| [aws_iam_role.api_gateway_cloudwatch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role)                                                                         | resource |
| [aws_iam_role.kb](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role)                                                                                             | resource |
| [aws_iam_role.server](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role)                                                                                         | resource |
| [aws_iam_role_policy_attachment.api_gateway_cloudwatch](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment)                                     | resource |
| [aws_iam_role_policy_attachment.bedrock_llms_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment)                                        | resource |
| [aws_iam_role_policy_attachment.kb_data_sources_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment)                                     | resource |
| [aws_iam_role_policy_attachment.kb_vector_store_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment)                                     | resource |
| [aws_iam_role_policy_attachment.lambda_basic_execution](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment)                                     | resource |
| [aws_iam_role_policy_attachment.lambda_bedrock_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment)                                      | resource |
| [aws_lambda_function.server](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function)                                                                           | resource |
| [aws_lambda_permission.apigw](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission)                                                                        | resource |
| [aws_s3_bucket.mcp_knowledge_base](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket)                                                                           | resource |
| [aws_s3_bucket_public_access_block.mcp_knowledge_base](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block)                                   | resource |
| [aws_s3_bucket_server_side_encryption_configuration.mcp_knowledge_base](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration) | resource |
| [aws_s3vectors_index.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3vectors_index)                                                                             | resource |
| [aws_s3vectors_vector_bucket.this](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3vectors_vector_bucket)                                                             | resource |
| [aws_wafv2_web_acl.api_gateway](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl)                                                                          | resource |
| [aws_wafv2_web_acl_association.api_gateway](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl_association)                                                  | resource |
| [awscc_bedrock_data_source.docs](https://registry.terraform.io/providers/hashicorp/awscc/latest/docs/resources/bedrock_data_source)                                                                 | resource |
| [awscc_bedrock_knowledge_base.this](https://registry.terraform.io/providers/hashicorp/awscc/latest/docs/resources/bedrock_knowledge_base)                                                           | resource |
| [azurerm_dns_cname_record.acm_validation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record)                                                         | resource |
| [azurerm_dns_cname_record.api_gateway](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record)                                                            | resource |

## Inputs

| Name                                                                                                                                                | Description                                                                                                                         | Type                                                                                                                          | Default | Required |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- | :------: |
| <a name="input_account_id"></a> [account_id](#input_account_id)                                                                                     | The AWS account ID where the MCP server resources will be created.                                                                  | `string`                                                                                                                      | n/a     |   yes    |
| <a name="input_application_insights_connection_string"></a> [application_insights_connection_string](#input_application_insights_connection_string) | The Application Insights connection string for monitoring and logging.                                                              | `string`                                                                                                                      | n/a     |   yes    |
| <a name="input_bedrock_knowledge_base_id"></a> [bedrock_knowledge_base_id](#input_bedrock_knowledge_base_id)                                        | The Bedrock knowledge base ID to be used by the MCP server.                                                                         | `string`                                                                                                                      | n/a     |   yes    |
| <a name="input_dns"></a> [dns](#input_dns)                                                                                                          | DNS configuration for the MCP server, including zone name, resource group name, and custom domain name for CloudFront distribution. | <pre>object({<br/> zone_name = string<br/> resource_group_name = string<br/> custom_domain_name = string<br/> })</pre>        | n/a     |   yes    |
| <a name="input_naming_config"></a> [naming_config](#input_naming_config)                                                                            | n/a                                                                                                                                 | <pre>object({<br/> prefix = string<br/> environment = string<br/> region = string<br/> instance_number = number<br/> })</pre> | n/a     |   yes    |
| <a name="input_tags"></a> [tags](#input_tags)                                                                                                       | A map of tags to assign to the resources.                                                                                           | `map(string)`                                                                                                                 | n/a     |   yes    |
| <a name="input_waf_rate_limit_per_ip"></a> [waf_rate_limit_per_ip](#input_waf_rate_limit_per_ip)                                                    | Maximum number of requests per IP address within the evaluation window (5 minutes). Requests exceeding this limit will be blocked.  | `number`                                                                                                                      | `2000`  |    no    |

## Outputs

| Name                                                                                                                             | Description                                                |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| <a name="output_cloudfront_distribution_arn"></a> [cloudfront_distribution_arn](#output_cloudfront_distribution_arn)             | CloudFront distribution ARN                                |
| <a name="output_cloudfront_distribution_domain"></a> [cloudfront_distribution_domain](#output_cloudfront_distribution_domain)    | CloudFront distribution domain name                        |
| <a name="output_cloudfront_distribution_id"></a> [cloudfront_distribution_id](#output_cloudfront_distribution_id)                | CloudFront distribution ID                                 |
| <a name="output_cloudfront_origin_verify_header"></a> [cloudfront_origin_verify_header](#output_cloudfront_origin_verify_header) | Generated secret header for CloudFront origin verification |
| <a name="output_custom_domain_name"></a> [custom_domain_name](#output_custom_domain_name)                                        | Custom domain name pointing to CloudFront                  |
| <a name="output_custom_domain_url"></a> [custom_domain_url](#output_custom_domain_url)                                           | Full HTTPS URL for the custom domain                       |
| <a name="output_http_api_endpoint"></a> [http_api_endpoint](#output_http_api_endpoint)                                           | HTTP API Gateway v2 endpoint URL (CloudFront origin)       |
| <a name="output_http_api_id"></a> [http_api_id](#output_http_api_id)                                                             | HTTP API Gateway v2 ID                                     |
| <a name="output_lambda_function_name"></a> [lambda_function_name](#output_lambda_function_name)                                  | Lambda function name serving the MCP server                |
| <a name="output_waf_web_acl_arn"></a> [waf_web_acl_arn](#output_waf_web_acl_arn)                                                 | WAF Web ACL ARN protecting CloudFront                      |
| <a name="output_waf_web_acl_id"></a> [waf_web_acl_id](#output_waf_web_acl_id)                                                    | WAF Web ACL ID protecting CloudFront                       |

<!-- END_TF_DOCS -->
