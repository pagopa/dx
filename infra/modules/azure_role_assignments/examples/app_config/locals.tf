locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "roleassignappconfig"
    instance_number = "01"
  }

  naming_config = {
    prefix          = local.environment.prefix,
    env_short       = local.environment.env_short,
    location        = local.environment.location,
    domain          = local.environment.domain,
    instance_number = tonumber(local.environment.instance_number),
  }

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    ManagementTeam = "Developer Experience"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/modules/azure_role_assignments/examples/app_config"
    CostCenter     = "TS000 - Tecnologia e Servizi"
  }
  resource_prefix = "${local.environment.prefix}-${local.environment.env_short}-${local.environment.location}"
}
