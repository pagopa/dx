locals {
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/tests/azure_cosmos_account"
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

  virtual_network = {
    name = provider::dx::resource_name(merge(local.environment, {
      app_name      = "e2e",
      resource_type = "virtual_network"
    }))
    resource_group_name = provider::dx::resource_name(merge(local.environment, {
      app_name      = "e2e",
      resource_type = "resource_group"
    }))
  }

  docker_image = "ghcr.io/pagopa/e2e-cosmos-network-access:latest"
}
