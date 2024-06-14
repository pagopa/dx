locals {
  environment = {
    prefix          = "io"
    env_short       = "p"
    location        = "italynorth"
    domain          = "dx"
    app_name        = "app-be"
    instance_number = "01"
  }

  location_short  = local.environment.location == "italynorth" ? "itn" : local.environment.location == "westeurope" ? "weu" : local.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project         = "${local.environment.prefix}-${local.environment.env_short}-${local.location_short}"
  resource_prefix = "${local.project}-${local.environment.domain}-${local.environment.app_name}"

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DX"
    ManagementTeam = "DX"
    Source         = "https://github.com/pagopa/dx/modules/azure_role_assignments/examples/complete"
    CostCenter     = "DX"
  }
}