locals {
  environment = {
    prefix          = var.prefix
    env_short       = var.environment
    location        = var.location
    domain          = var.domain
    app_name        = var.app_name
    instance_number = var.instance_number
  }

  naming_config = {
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    domain          = local.environment.domain
    name            = local.environment.app_name
    instance_number = tonumber(local.environment.instance_number)
  }

  # Resource names generated with DX provider
  resource_group_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "resource_group" }
  ))

  storage_account_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "storage_account" }
  ))

  function_app_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "function_app" }
  ))

  cosmos_db_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "cosmos_account" }
  ))

  app_service_plan_name = provider::dx::resource_name(merge(
    local.naming_config,
    { resource_type = "app_service_plan" }
  ))

  tags = {
    CostCenter     = var.cost_center
    CreatedBy      = "Terraform"
    Environment    = var.environment_tag
    BusinessUnit   = var.business_unit
    Source         = var.source_repo
    ManagementTeam = var.management_team
  }
}
