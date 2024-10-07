locals {
  environment = {
    prefix          = "io"
    env_short       = "p"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  location_short = lookup({
    "italynorth"         = "itn"
    "westeurope"         = "weu"
    "germanywestcentral" = "gwc"
  }, local.environment.location, "neu")

  project = "${local.environment.prefix}-${local.environment.env_short}-${local.location_short}"

  tags = {
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/modules/azure_postgres_server/examples/complete"
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
  }
}