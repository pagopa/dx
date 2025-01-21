locals {
  prefix         = "dx"
  env_short      = "d"
  location       = "italynorth"
  location_short = "itn"

  tags = {
    CostCenter     = "TS700 - ENGINEERING"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/resources/dev"
    ManagementTeam = "Developer Experience"
  }
}