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
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    domain          = local.environment.domain
    name            = local.environment.app_name
    instance_number = tonumber(local.environment.instance_number)
  }

  virtual_network = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      domain        = null,
      name          = "common",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
      domain        = null,
      name          = "network",
      resource_type = "resource_group"
    }))
  }

  tags = {
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/modules/azure_role_assignments/examples/complete"
    CostCenter  = "TS700 - ENGINEERING"
  }
}
