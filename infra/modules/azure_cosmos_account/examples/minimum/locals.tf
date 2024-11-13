locals {
  environment = {
    prefix          = "io"
    env_short       = "p"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  location_map = {
    "italynorth"         = "itn"
    "westeurope"         = "weu"
    "germanywestcentral" = "gwc"
    "spaincentral"       = "spc"
  }
  location_short = lookup(local.location_map, local.environment.location, "itn")
  project        = "${local.environment.prefix}-${local.environment.env_short}-${local.location_short}"

  tags = {
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/modules/azure_role_assignments/examples/complete"
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
  }
}
