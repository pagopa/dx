locals {
  prefix         = "dx"
  env_short      = "d"
  location       = "italynorth"
  location_short = "itn"

  tags = {
    CostCenter  = "TS700 - ENGINEERING"
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/resources/dev"
  }
}
