locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  naming_config = {
    prefix      = local.environment.prefix,
    environment = local.environment.env_short,
    location = tomap({
      "italynorth" = "itn",
      "westeurope" = "weu"
    })[local.environment.location]
    name            = local.environment.app_name,
    instance_number = tonumber(local.environment.instance_number),
  }

  tags = {
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/modules/azure_function_app_exposed/examples/complete"
    CostCenter  = "TS700 - ENGINEERING"
  }
}
