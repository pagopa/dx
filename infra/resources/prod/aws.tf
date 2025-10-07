module "aws_core_values" {
  source  = "pagopa-dx/aws-core-values-exporter/aws"
  version = "~> 0.0"

  core_state = local.core_state
}

module "mcp_server" {
  source = "../_modules/mcp_server"
  providers = {
    aws = aws.eu-central-1
  }

  naming_config             = local.aws_naming_config
  account_id                = data.aws_caller_identity.current.account_id
  bedrock_knowledge_base_id = "TWMAUIB8QZ"
  tags                      = local.tags
}
