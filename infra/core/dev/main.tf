module "azure" {
  source  = "pagopa-dx/azure-core-infra/azurerm"
  version = "~> 3.0"

  environment = local.azure_environment

  nat_enabled  = false
  vpn_enabled  = true
  test_enabled = true

  virtual_network_cidr = local.azure.vnet_cidr

  tags = local.tags
}

module "aws" {
  source  = "pagopa-dx/aws-core-infra/aws"
  version = "~> 0.0"

  environment       = local.aws_environment
  vpc_cidr          = local.aws.vpc_cidr
  nat_gateway_count = 0

  tags = local.tags
}

resource "aws_budgets_budget" "monthly_budget" {
  name         = "monthly-budget"
  budget_type  = "COST"
  limit_amount = "50"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_types {
    include_tax = true
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["team-devex+aws${local.tags.Environment}@pagopa.it"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 75
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["team-devex+aws${local.tags.Environment}@pagopa.it"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["team-devex+aws${local.tags.Environment}@pagopa.it"]
  }
}
