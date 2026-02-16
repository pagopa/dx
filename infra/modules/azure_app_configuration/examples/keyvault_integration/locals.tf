locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/tests/azure_app_configuration"
    ManagementTeam = "Developer Experience"
    TestSuite      = "e2e"
  }

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    app_name        = "e2e"
    instance_number = "01"
  }

  naming_config = {
    prefix          = local.environment.prefix,
    environment     = local.environment.env_short,
    location        = local.environment.location,
    name            = local.environment.app_name,
    instance_number = tonumber(local.environment.instance_number),
  }

  e2e_virtual_network = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "e2e",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "e2e",
      resource_type = "resource_group"
    }))
  }

  e2e_log_analytics_workspace = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "e2e",
      resource_type = "log_analytics"
    }))
  }

  docker_image = "ghcr.io/pagopa/e2e-appconfiguration-all-scenarios:latest"
}
