locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    instance_number = "01"
  }

  location_short  = local.environment.location == "italynorth" ? "itn" : local.environment.location == "westeurope" ? "weu" : local.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project         = "${local.environment.prefix}-${local.environment.env_short}-${local.location_short}"
  resource_prefix = "${local.project}-${local.environment.domain}-${local.environment.app_name}"

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/modules/azure_role_assignments/examples/complete"
    CostCenter     = "TS310 - PAGAMENTI & SERVIZI"
  }
}