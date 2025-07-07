locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "eu-south-1"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/modules/aws_web_app/examples/basic"
    ManagementTeam = "Developer Experience"
  }
}
