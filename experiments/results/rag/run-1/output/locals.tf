locals {
  environment = {
    prefix          = "myapp"
    env_short       = "p"
    location        = "italynorth"
    domain          = "backend"
    app_name        = "api"
    instance_number = "01"
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    BusinessUnit   = "DevEx"
    Source         = "https://github.com/pagopa/dx/blob/main/experiments/results/rag/run-1/output"
    ManagementTeam = "Developer Experience"
  }

  naming_config = {
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    domain          = local.environment.domain
    name            = local.environment.app_name
    instance_number = tonumber(local.environment.instance_number)
  }

  # Generate resource names using DX provider
  resource_group_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "resource_group" }
  ))

  function_app_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "function_app" }
  ))

  storage_account_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "storage_account" }
  ))

  cosmos_db_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "cosmos_db_nosql" }
  ))

  key_vault_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "key_vault" }
  ))

  app_service_plan_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "app_service_plan" }
  ))

  application_insights_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "application_insights" }
  ))

  log_analytics_workspace_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "log_analytics_workspace" }
  ))
}
