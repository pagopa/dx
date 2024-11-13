locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "be"
    instance_number = "01"
  }

  location_map = {
    "italynorth"         = "itn",
    "westeurope"         = "weu",
    "germanywestcentral" = "gwc"
    "spaincentral"       = "spc"
  }

  location_short  = lookup(local.location_map, local.environment.location, "neu")
  project         = "${local.environment.prefix}-${local.environment.env_short}-${local.location_short}"
  resource_prefix = "${local.project}-${local.environment.domain}-${local.environment.app_name}"

  tags = {
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/modules/azure_role_assignments/examples/complete"
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
  }
}
