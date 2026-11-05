locals {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  location_short = "itn"
  project        = "${local.environment.prefix}-${local.environment.env_short}-${local.location_short}-${local.environment.domain}"

  tags = {
    CostCenter     = "TS720 - DEV EX"
    CreatedBy      = "Terraform"
    Environment    = "Uat"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/modules/azure_app_service_plan_autoscaler/examples/complete"
  }
}
