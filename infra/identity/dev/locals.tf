locals {

  prefix         = "dx"
  env_short      = "d"
  env            = "dev"
  location       = "italynorth"
  location_short = "itn"
  project        = "${local.prefix}-${local.env_short}"

  repo_name = "dx"

  tags = {
    CostCenter  = "TS700 - ENGINEERING"
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/identity/dev"
  }
}
