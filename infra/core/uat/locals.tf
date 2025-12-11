locals {
  azure_environment = {
    prefix          = "dx"
    location        = "italynorth"
    location_short  = "itn"
    env_short       = "u"
    app_name        = "core"
    instance_number = "01"
  }

  aws_environment = {
    prefix          = "dx"
    env_short       = "u"
    region          = "eu-south-1"
    app_name        = "core"
    instance_number = "01"
  }

  aws = {
    vpc_cidr = "10.20.0.0/16"
  }

  azure = {
    vnet_cidr = "10.53.0.0/16"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Environment    = "Uat"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/core/uat"
    ManagementTeam = "Developer Experience"
  }
}
