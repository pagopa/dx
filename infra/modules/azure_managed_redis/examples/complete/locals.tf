locals {
  tags = {
    BusinessUnit   = "DevEx"
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Dev"
    ManagementTeam = "Developer Experience"
    Source         = "https://github.com/pagopa/dx/infra/modules/azure_managed_redis/examples/complete"
  }

  environment = {
    prefix          = "dx"
    env_short       = "d"
    location        = "italynorth"
    domain          = "example"
    app_name        = "amr"
    instance_number = "01"
  }

  # Fill these in when running the example against a real subscription.
  virtual_network_id         = null
  log_analytics_workspace_id = null
  action_group_id            = null
}
