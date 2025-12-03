# WAF Web ACL for REST API Gateway protection

resource "aws_wafv2_web_acl" "api_gateway" {
  name = provider::awsdx::resource_name(merge(var.naming_config, {
    name          = "mcp-api"
    resource_type = "wafv2_web_acl"
  }))
  description = "Web ACL for MCP API Gateway in ${var.naming_config.environment}"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.naming_config.prefix}-${var.naming_config.environment}-mcp-api-waf"
    sampled_requests_enabled   = true
  }

  # Rate limiting rule - configurable via variable
  # Defaults to 500 requests per IP per 5 minutes
  rule {
    name     = "rate-limit-per-ip"
    priority = 0

    action {
      block {}
    }

    statement {
      rate_based_statement {
        aggregate_key_type    = "IP"
        limit                 = var.waf_rate_limit_per_ip
        evaluation_window_sec = 300 # 5 minutes
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.naming_config.prefix}-${var.naming_config.environment}-mcp-api-rate-limit"
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
      metric_name                = "${var.naming_config.prefix}-${var.naming_config.environment}-mcp-api-core-rules"
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
      metric_name                = "${var.naming_config.prefix}-${var.naming_config.environment}-mcp-api-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  tags = var.tags
}

# Associate WAF with API Gateway stage
resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = aws_api_gateway_stage.prod.arn
  web_acl_arn  = aws_wafv2_web_acl.api_gateway.arn
}
