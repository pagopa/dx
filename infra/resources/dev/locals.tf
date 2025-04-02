locals {
  prefix    = "dx"
  env_short = "d"
  location  = "italynorth"
  project   = "${local.prefix}-${local.env_short}"

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/resources/dev"
    ManagementTeam = "Developer Experience"
  }
}
