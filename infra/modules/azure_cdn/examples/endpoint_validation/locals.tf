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
      app_name      = "",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.environment, {
      app_name      = "",
      resource_type = "resource_group"
    }))
  }

  tags = {
    CostCenter  = "TS000 - TECNOLOGIA & SERVIZI"
    Environment = "Uat"
    Source      = "https://github.com/pagopa/dx/modules/azure_cdn/examples/endpoint_validation"
  }
}
