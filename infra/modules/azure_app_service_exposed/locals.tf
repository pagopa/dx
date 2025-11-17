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
      sku            = "P1v3"
      slot           = true
      zone_balancing = true
      always_on      = true
    }
    high_load = {
      sku            = "P2v3"
      slot           = true
      zone_balancing = true
      always_on      = true
    }
  }

  use_case_features = local.use_cases[var.use_case]
  app_service_plan = {
    enable = var.app_service_plan_id == null
  }

  app_service = {
    name     = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service" }))
    sku_name = var.size != null ? var.size : local.use_case_features.sku
  }

  app_service_slot = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "${var.environment.app_name}-staging",
      resource_type = "app_service"
    }))
  }

  application_insights = {
    enable = nonsensitive(var.application_insights_connection_string != null)
  }
}
