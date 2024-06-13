locals {
  env_short = "d"
  location  = "westeurope"

  tags = {
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy   = "Terraform"
    Environment = "dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/resources/dev/westeurope"
  }
}
