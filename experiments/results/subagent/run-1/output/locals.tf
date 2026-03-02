locals {
  environment = var.environment

  # Naming configuration for dx provider
  naming_config = {
    prefix          = local.environment.prefix
    environment     = local.environment.env_short
    location        = local.environment.location
    domain          = local.environment.domain
    name            = local.environment.app_name
    instance_number = tonumber(local.environment.instance_number)
  }

  # Resource names using provider::dx::resource_name()
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

  # Environment mapping for tags
  environment_tag = local.environment.env_short == "p" ? "Prod" : (
    local.environment.env_short == "u" ? "Uat" : "Dev"
  )

  # Mandatory DX tags
  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = local.environment_tag
    BusinessUnit   = var.business_unit
    ManagementTeam = var.management_team
  }
}
