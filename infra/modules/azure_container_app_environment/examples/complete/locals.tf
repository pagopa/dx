locals {
  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "modules"
    app_name        = "test"
    instance_number = "01"
  }

  virtual_network = {
    name = provider::dx::resource_name(merge(local.environment, {
      domain        = "",
      app_name      = "common",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.environment, {
      domain        = "",
      app_name      = "network",
      resource_type = "resource_group"
    }))
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/modules/azure_container_app_environment/examples/complete"
    ManagementTeam = "Developer Experience"
  }
}
