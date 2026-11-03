locals {
  azure_environment = {
    prefix          = "dx"
    location        = "italynorth"
    location_short  = "itn"
    env_short       = "p"
    domain          = "devex"
    app_name        = "core"
    instance_number = "01"
  }

  aws_environment = {
    prefix          = "dx"
    region          = "eu-south-1"
    region_short    = "eus1"
    env_short       = "p"
    domain          = "devex"
    app_name        = "core"
    instance_number = "01"
  }


  tags = {
    CostCenter  = "TS720 - DEV EX"
    Owner       = "DevEx"
    Environment = "Prod"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/bootstrapper/prod"
  }
}
