locals {
  environment = {
    prefix          = "dx"
    env_short       = "u"
    location        = "italynorth"
    domain          = "e2e"
    app_name        = "test"
    instance_number = "01"
  }

  virtual_network = {
    name = provider::dx::resource_name(merge(local.environment, {
      app_name      = "common",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.environment, {
      app_name      = "network",
      resource_type = "resource_group"
    }))
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Uat"
    BusinessUnit   = "DevEx"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/modules/azure_cdn/examples/endpoint_validation"
  }
}
