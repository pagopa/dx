locals {
  environment = {
    prefix          = "dx"
    location        = "italynorth"
    location_short  = "itn"
    env_short       = "p"
    app_name        = "core"
    instance_number = "01"
  }

  virtual_network_cidr = "10.52.0.0/16"

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Environment    = "Prod"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/core/prod"
    ManagementTeam = "Developer Experience"
    TestName       = "Create Azure core resources for prod DEVEX environment"
  }
}
