locals {

  prefix          = "dx"
  env_short       = "d"
  location        = "italynorth"
  location_short  = "itn"
  domain          = "playground"
  project         = "${local.prefix}-${local.env_short}-${local.location_short}-${local.domain}"
  instance_number = "01"

  repo_name = "dx"

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/identity/dev"
  }
}
