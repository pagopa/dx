locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "sbns"
    instance_number = "01"
  }

  naming_config = {
    prefix          = local.environment.prefix,
    environment     = local.environment.env_short,
    location        = local.environment.location
    name            = local.environment.app_name,
    instance_number = tonumber(local.environment.instance_number),
  }

  virtual_network = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "common",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "network",
      resource_type = "resource_group"
    }))
  }

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/modules/azure_service_bus_namespace/examples/complete"
    CostCenter     = "TS000 - Tecnologia e Servizi"
    ManagementTeam = "Developer Experience"
  }
}
