# CloudFront distribution in front of HTTP API Gateway v2 with WAF protection
# Creates an ACM certificate for the custom domain.
resource "aws_acm_certificate" "api_custom_cdn" {
  provider          = aws.us_east_1
  domain_name       = var.dns.custom_domain_name
  validation_method = "DNS"
  tags              = var.tags
}

# Generate a random secret for origin verification
resource "random_password" "cloudfront_origin_verify" {
  length  = 32
  special = true
}

# CloudFront Origin Access Control for API Gateway
resource "aws_cloudfront_origin_access_control" "api_gateway" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "mcp-apigw"
    resource_type = "cloudfront_origin_access_identity"
  }))
  description                       = "Origin Access Control for MCP API Gateway"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront distribution
# trivy:ignore:AVD-AWS-0010
resource "aws_cloudfront_distribution" "mcp_server" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "MCP Server distribution with WAF protection"
  price_class     = "PriceClass_100" # US, Canada, Europe
  web_acl_id      = aws_wafv2_web_acl.cloudfront.arn
  aliases         = [var.dns.custom_domain_name]

  origin {
    domain_name = replace(aws_apigatewayv2_api.mcp_server.api_endpoint, "https://", "")
    origin_id   = "mcp-api-gateway"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = random_password.cloudfront_origin_verify.result
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "mcp-api-gateway"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Accept"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.api_custom_cdn.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = var.tags

  depends_on = [
    aws_acm_certificate.api_custom_cdn,
    azurerm_dns_cname_record.acm_cdn_validation,
    aws_apigatewayv2_stage.default
  ]
}
