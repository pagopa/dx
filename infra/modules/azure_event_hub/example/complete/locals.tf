locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "eh"
    instance_number = "01"
  }

  virtual_network = {
    name = provider::dx::resource_name(merge(local.environment, {
      app_name      = "common",
      domain        = ""
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.environment, {
      app_name      = "network",
      domain        = ""
      resource_type = "resource_group"
    }))
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    Owner          = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/modules/azure_event_hub/examples/complete"
  }
}
