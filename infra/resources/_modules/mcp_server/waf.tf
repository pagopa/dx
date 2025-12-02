# WAF Web ACL for API Gateway protection
# Note: API Gateway HTTP v2 doesn't support direct WAF association.
# WAF must be attached to CloudFront or API Gateway REST API.

resource "aws_wafv2_web_acl" "cloudfront" {
  provider = aws.us_east_1

  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "mcp-cloudfront"
    resource_type = "wafv2_web_acl"
  }))
  description = "Web ACL for MCP CloudFront distribution in ${var.naming_config.environment}"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.naming_config.prefix}-${var.naming_config.environment}-mcp-cloudfront-waf"
    sampled_requests_enabled   = true
  }

  # Rate limiting rule for /mcp path requests
  # This is the primary protection - blocks excessive requests from single IPs
  rule {
    name     = "rate-limit-mcp-endpoint"
    priority = 0

    action {
      block {} # Active blocking - protects against DoS
    }

    statement {
      rate_based_statement {
        aggregate_key_type    = "IP"
        limit                 = var.waf_rate_limit_per_ip
        evaluation_window_sec = 300 # 5 minutes

        scope_down_statement {
          byte_match_statement {
            field_to_match {
              uri_path {}
            }

            positional_constraint = "STARTS_WITH"
            search_string         = "/mcp"

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.naming_config.prefix}-${var.naming_config.environment}-mcp-cloudfront-rate-limit"
    }
  }

  # AWS Managed Rules - Core Rule Set (CRS)
  # Note: EC2MetaDataSSRF rule excluded as it triggers false positives with MCP payloads
  rule {
    name     = "aws-managed-core-rules"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          name = "EC2MetaDataSSRF_BODY"
          action_to_use {
            count {}
          }
        }

        rule_action_override {
          name = "EC2MetaDataSSRF_COOKIE"
          action_to_use {
            count {}
          }
        }

        rule_action_override {
          name = "EC2MetaDataSSRF_URIPATH"
          action_to_use {
            count {}
          }
        }

        rule_action_override {
          name = "EC2MetaDataSSRF_QUERYARGUMENTS"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.naming_config.prefix}-${var.naming_config.environment}-mcp-cloudfront-core-rules"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "aws-managed-known-bad-inputs"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.naming_config.prefix}-${var.naming_config.environment}-mcp-cloudfront-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  tags = var.tags
}
