locals {
  env_short = "p"
  location  = "westeurope"

  tags = {
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy   = "Terraform"
    Environment = "Prod"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/resources/prod/westeurope"
  }
}
