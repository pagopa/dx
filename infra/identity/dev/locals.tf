locals {

  prefix         = "dx"
  env_short      = "d"
  env            = "dev"
  location       = "italynorth"
  location_short = "itn"
  project        = "${local.prefix}-${local.env_short}"

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
