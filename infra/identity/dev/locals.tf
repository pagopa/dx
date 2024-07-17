locals {

  prefix    = "dx"
  env_short = "d"
  env       = "dev"
  location  = "italynorth"
  project   = "${local.prefix}-${local.env_short}"

  repo_name = "dx"

  tags = {
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/identity/dev"
  }
}
