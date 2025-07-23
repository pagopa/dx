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
    Source         = "https://github.com/pagopa/dx/modules/github_selfhosted_runner_on_codebuild/examples/complete"
    ManagementTeam = "Developer Experience"
  }

  project = "${local.environment.prefix}-${local.environment.env_short}"
  domain  = local.environment.domain == null ? "-" : "-${local.environment.domain}-"

  app_prefix = "${local.project}${local.domain}${local.environment.app_name}"
  app_suffix = local.environment.instance_number
}
