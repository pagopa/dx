resource "aws_wafv2_web_acl" "cloudfront" {
  count = var.enable_waf ? 1 : 0

  name  = "${local.app_prefix}-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }


  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          action_to_use {
            count {}
          }

          name = "NoUserAgent_HEADER"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.app_prefix}-WAF-AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Bad Inputs Rule Set
  # https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html#aws-managed-rule-groups-baseline-known-bad-inputs
  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
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
      metric_name                = "${local.app_prefix}-WAF-AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = false
    }
  }

  # Linux Operating System Rule Group
  # https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html#aws-managed-rule-groups-use-case-linux-os
  rule {
    name     = "AWS-AWSManagedRulesLinuxRuleSet"
    priority = 3

    override_action {
      none {}
    }


    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesLinuxRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.app_prefix}-WAF-AWSManagedRulesLinuxRuleSet"
      sampled_requests_enabled   = false
    }
  }

  # POSIX Operating System Rule Group
  # https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html#aws-managed-rule-groups-use-case-posix-os
  rule {
    name     = "AWS-AWSManagedRulesUnixRuleSet"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesUnixRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.app_prefix}-WAF-AWSManagedRulesUnixRuleSet"
      sampled_requests_enabled   = false
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = false
    metric_name                = "${local.app_prefix}-WAF"
    sampled_requests_enabled   = false
  }
}

