# Outputs for CloudFront deployment with WAF

# CloudFront distribution
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.mcp_server.id
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.mcp_server.domain_name
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.mcp_server.arn
}

# Custom domain
output "custom_domain_name" {
  description = "Custom domain name pointing to CloudFront"
  value       = var.dns.custom_domain_name
}

output "custom_domain_url" {
  description = "Full HTTPS URL for the custom domain"
  value       = "https://${var.dns.custom_domain_name}"
}

# HTTP API Gateway v2 (origin)
output "http_api_endpoint" {
  description = "HTTP API Gateway v2 endpoint URL (CloudFront origin)"
  value       = aws_apigatewayv2_api.mcp_server.api_endpoint
}

output "http_api_id" {
  description = "HTTP API Gateway v2 ID"
  value       = aws_apigatewayv2_api.mcp_server.id
}

# WAF
output "waf_web_acl_id" {
  description = "WAF Web ACL ID protecting CloudFront"
  value       = aws_wafv2_web_acl.cloudfront.id
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN protecting CloudFront"
  value       = aws_wafv2_web_acl.cloudfront.arn
}

# Lambda
output "lambda_function_name" {
  description = "Lambda function name serving the MCP server"
  value       = aws_lambda_function.server.function_name
}

output "cloudfront_origin_verify_header" {
  description = "Generated secret header for CloudFront origin verification"
  value       = random_password.cloudfront_origin_verify.result
  sensitive   = true
}
