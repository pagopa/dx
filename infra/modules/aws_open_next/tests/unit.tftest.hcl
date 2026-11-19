mock_provider "aws" {
  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}"
    }
  }
}

mock_provider "aws" {
  alias = "us-east-1"
}

mock_provider "archive" {}

variables {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    region          = "eu-south-1"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }
  tags = {}
}

run "waf_output_disabled" {
  command = plan

  providers = {
    aws           = aws
    aws.us-east-1 = aws.us-east-1
    archive       = archive
  }

  assert {
    condition     = output.cloudfront.waf == null
    error_message = "The WAF output must be null when WAF is disabled."
  }
}

run "waf_output_enabled" {
  command = plan

  providers = {
    aws           = aws
    aws.us-east-1 = aws.us-east-1
    archive       = archive
  }

  variables {
    enable_waf = true
  }

  override_resource {
    target          = module.cloudfront.aws_wafv2_web_acl.cloudfront[0]
    override_during = plan
    values = {
      arn = "arn:aws:wafv2:us-east-1:123456789012:global/webacl/test/12345678"
    }
  }

  assert {
    condition     = output.cloudfront.waf.name == "dx-u-modules-test-opnext-cloudfront-waf"
    error_message = "The WAF output must expose the web ACL name."
  }

  assert {
    condition     = output.cloudfront.waf.arn == "arn:aws:wafv2:us-east-1:123456789012:global/webacl/test/12345678"
    error_message = "The WAF output must expose the web ACL ARN."
  }
}
