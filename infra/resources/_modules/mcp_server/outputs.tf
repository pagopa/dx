# Outputs for REST API Gateway deployment with WAF

# REST API Gateway
output "rest_api_id" {
  description = "REST API Gateway ID"
  value       = aws_api_gateway_rest_api.mcp_server.id
}

output "rest_api_execution_arn" {
  description = "REST API Gateway execution ARN"
  value       = aws_api_gateway_rest_api.mcp_server.execution_arn
}

output "api_gateway_stage_arn" {
  description = "API Gateway stage ARN"
  value       = aws_api_gateway_stage.prod.arn
}

# Custom domain
output "custom_domain_name" {
  description = "Custom domain name for the API Gateway"
  value       = var.dns.custom_domain_name
}

output "custom_domain_url" {
  description = "Full HTTPS URL for the custom domain"
  value       = "https://${var.dns.custom_domain_name}"
}

output "api_gateway_regional_domain" {
  description = "Regional domain name for the API Gateway custom domain"
  value       = aws_api_gateway_domain_name.mcp_server.regional_domain_name
}

# WAF
output "waf_web_acl_id" {
  description = "WAF Web ACL ID protecting API Gateway"
  value       = aws_wafv2_web_acl.api_gateway.id
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN protecting API Gateway"
  value       = aws_wafv2_web_acl.api_gateway.arn
}

# Lambda
output "lambda_function_name" {
  description = "Lambda function name serving the MCP server"
  value       = aws_lambda_function.server.function_name
}

