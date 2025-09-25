locals {
  azure_environment = {
    prefix          = "dx"
    location        = "italynorth"
    location_short  = "itn"
    env_short       = "d"
    app_name        = "examples"
    instance_number = "01"
  }

  aws_environment = {
    prefix          = "dx"
    env_short       = "d"
    region          = "eu-south-1"
    app_name        = "examples"
    instance_number = "01"
  }

  aws = {
    vpc_cidr = "10.1.0.0/16"
  }

  azure = {
    vnet_cidr = "10.51.0.0/16"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Environment    = "Dev"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/modules/aws_azure_vpn/examples/complete"
    ManagementTeam = "Developer Experience"
  }
}
