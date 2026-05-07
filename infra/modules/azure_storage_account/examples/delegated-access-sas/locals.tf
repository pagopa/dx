locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "e2e"
    app_name        = "stgsas"
    instance_number = format("%02d", random_integer.instance_number.result)
  }

  naming_config = {
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    domain          = local.environment.domain
    name            = local.environment.app_name
    instance_number = tonumber(local.environment.instance_number)
  }

  container_name = "delegated-access"

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/tree/main/infra/modules/azure_storage_account/examples/delegated-access-sas"
    ManagementTeam = "Developer Experience"
    TestSuite      = "delegated-access"
  }
}