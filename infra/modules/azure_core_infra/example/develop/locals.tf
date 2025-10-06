locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  naming_config = {
    prefix      = local.environment.prefix,
    environment = local.environment.env_short,
    location    = local.environment.location,
    domain      = local.environment.domain,
    name        = local.environment.app_name,
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/modules/azure_core_infra/examples/develop"

    # For testing
    hidden-link                    = "https://test.com"
    APPINSIGHTS_INSTRUMENTATIONKEY = "00000000-0000-0000-0000-000000000000"
    DBPassword                     = "P@ssw0rd1234"
  }
}
