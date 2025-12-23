module "aws_core_values" {
  source  = "pagopa-dx/aws-core-values-exporter/aws"
  version = "~> 0.0"

  core_state = local.core_state
}

module "mcp_server" {
  source = "../_modules/mcp_server"
  providers = {
    aws           = aws.eu-central-1
    aws.us_east_1 = aws.us-east-1
    awscc         = awscc.eu-central-1
  }

  naming_config                          = merge(local.aws_naming_config, { region = "eu-central-1" })
  account_id                             = data.aws_caller_identity.current.account_id
  application_insights_connection_string = data.azurerm_application_insights.this.connection_string
  mcp_auth_type                          = "oauth"

  dns = {
    custom_domain_name  = "api.dx.pagopa.it"
    zone_name           = "dx.pagopa.it"
    resource_group_name = module.azure_core_values.network_resource_group_name
  }

  tags = local.tags
}
