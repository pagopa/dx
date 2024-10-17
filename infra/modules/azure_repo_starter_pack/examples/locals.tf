locals {
  environment = {
    prefix          = "io"
    env_short       = "p"
    location        = "italynorth"
    domain          = "dxrbac"
    instance_number = "01"
  }

  tags = {
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/modules/azure_repo_starter_pack/examples/complete"
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
  }
}
