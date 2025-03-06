locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
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
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/modules/azure_container_app_environment/examples/complete"
    ManagementTeam = "Developer Experience"
  }
}
