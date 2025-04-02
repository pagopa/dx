locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  location_map = {
    "italynorth"         = "itn"
    "westeurope"         = "weu"
    "germanywestcentral" = "gwc"
    "spaincentral"       = "spc"
  }

  location_short = lookup(local.location_map, local.environment.location, "itn")

  naming_config = {
    prefix          = local.environment.prefix,
    environment     = local.environment.env_short,
    location        = local.location_short
    domain          = local.environment.domain,
    name            = local.environment.app_name,
    instance_number = tonumber(local.environment.instance_number),
  }

  virtual_network = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      domain        = "",
      name          = "common",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.naming_config, {
      domain        = "",
      name          = "network",
      resource_type = "resource_group"
    }))
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    Source         = "https://github.com/pagopa/dx/modules/azure_cosmos_account/examples/complete"
    ManagementTeam = "Developer Experience"
  }
}
