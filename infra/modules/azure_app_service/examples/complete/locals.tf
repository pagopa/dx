locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  location_short = "itn"

  naming_config = {
    prefix          = local.environment.prefix,
    environment     = local.environment.env_short,
    location        = local.location_short,
    instance_number = tonumber(local.environment.instance_number),
  }

  virtual_network_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "common",
    resource_type = "virtual_network"
  }))
  network_rg_name = provider::dx::resource_name(merge(local.naming_config, {
    name          = "network",
    resource_type = "resource_group"
  }))

  tags = {
    CreatedBy   = "Terraform"
    Environment = "Dev"
    Owner       = "DevEx"
    Source      = "https://github.com/pagopa/dx/modules/azure_azure_app_service/examples/complete"
    CostCenter  = "TS700 - ENGINEERING"
  }
}
