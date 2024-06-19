locals {

  prefix    = "dx"
  env_short = "p"
  env       = "prod"
  location  = "westeurope"
  project   = "${local.prefix}-${local.env_short}"

  repo_name = "dx"

  tags = {
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy   = "Terraform"
    Environment = "Prod"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/identity/prod"
  }
}
