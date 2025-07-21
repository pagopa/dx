locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "eu-south-1"
    domain          = "test"
    app_name        = "aws-core"
    instance_number = "01"
  }

  tags = {
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/modules/aws_core_infra/examples/complete"
    CostCenter  = "TS700 - ENGINEERING"
  }
}
