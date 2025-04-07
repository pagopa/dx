locals {
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service_plan" }))
  }

  function_app = {
    name                   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_app" }))
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s"
    is_slot_enabled        = local.tier == "s" ? 0 : 1
    worker_process_count   = local.worker_process_count_mapping[local.tier]
    has_durable            = var.has_durable_functions ? 1 : 0
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  storage_account = {
    replication_type = local.tier == "s" ? "LRS" : "ZRS"
    name             = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_storage_account" }))
    durable_name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "durable_function_storage_account" }))
  }
}
