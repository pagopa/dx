locals {
  azure_environment = {
    prefix          = "dx"
    location        = "italynorth"
    location_short  = "itn"
    env_short       = "p"
    app_name        = "core"
    instance_number = "01"
  }

  aws_environment = {
    prefix          = "dx"
    env_short       = "p"
    region          = "eu-south-1"
    app_name        = "core"
    instance_number = "01"
  }

  aws = {
    vpc_cidr = "10.10.0.0/16"
  }

  azure = {
    vnet_cidr = "10.52.0.0/16"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Environment    = "Prod"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/core/prod"
    ManagementTeam = "Developer Experience"
  }
}
