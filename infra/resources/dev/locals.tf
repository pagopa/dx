locals {
  aws_naming_config = {
    prefix          = "dx"
    environment     = "d"
    region          = "eu-south-1"
    instance_number = 1
  }

  core_state = {
    resource_group_name  = "dx-d-itn-tfstate-rg-01"
    storage_account_name = "dxditntfstatest01"
    container_name       = "terraform-state"
    key                  = "dx.core.dev.tfstate"
  }

  tags = {
    CostCenter  = "TS000 - TECNOLOGIA & SERVIZI"
    Owner       = "DevEx"
    Environment = "Dev"
    Source      = "https://github.com/pagopa/dx/blob/main/infra/resources/dev"
  }
}
