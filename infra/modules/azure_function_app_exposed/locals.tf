locals {
  tags = merge(var.tags, { ModuleSource = "DX", ModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), ModuleName = try(jsondecode(file("${path.module}/package.json")).name, "unknown") })
  naming_config = {
    prefix          = var.environment.prefix,
    environment     = var.environment.env_short,
    location        = var.environment.location
    domain          = var.environment.domain,
    name            = var.environment.app_name,
    instance_number = tonumber(var.environment.instance_number),
  }

  use_cases = {
    default = {
      sku              = "P1v3"
      zone_balancing   = true
      slot             = true
      replication_type = "ZRS"
    }
    high_load = {
      sku              = "P2mv3"
      zone_balancing   = true
      slot             = true
      replication_type = "ZRS"
    }
  }

  use_case_features = local.use_cases[var.use_case]

  worker_process_count = local.worker_process_count_map[local.function_app.sku_name]

  app_service_plan = {
    enable = var.app_service_plan_id == null
    name   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service_plan" }))
  }

  function_app = {
    name        = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_app" }))
    sku_name    = var.size != null ? var.size : local.use_case_features.sku
    has_durable = var.has_durable_functions ? 1 : 0
  }

  function_app_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }

  storage_account = {
    name         = provider::dx::resource_name(merge(local.naming_config, { resource_type = "function_storage_account" }))
    durable_name = provider::dx::resource_name(merge(local.naming_config, { resource_type = "durable_function_storage_account" }))
  }
}
