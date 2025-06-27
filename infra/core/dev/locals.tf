locals {
  environment = {
    prefix          = "dx"
    location        = "italynorth"
    location_short  = "itn"
    env_short       = "d"
    app_name        = "core"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Environment    = "Dev"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/core/dev"
    ManagementTeam = "Developer Experience"
    TestName       = "Create Azure core resources for dev DEVEX environment"
  }
}
