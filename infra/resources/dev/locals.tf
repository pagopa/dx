locals {
  environment = {
    prefix          = "dx"
    environment     = "d"
    location        = "italynorth"
    instance_number = "01"
  }

  tests_kind = ["integration", "e2e"]

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Owner          = "DevEx"
    Environment    = "Prod"
    Source         = "https://github.com/pagopa/dx/blob/main/infra/resources/dev"
    ManagementTeam = "Developer Experience"
  }
}
