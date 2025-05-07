locals {
  tags = merge(var.tags, { DXModuleVersion = try(jsondecode(file("${path.module}/package.json")).version, "unknown"), DXModuleName = try(jsondecode(file("${path.module}/package.json")).name) })
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
  }

  app_service = {
    name                   = provider::dx::resource_name(merge(local.naming_config, { resource_type = "app_service" }))
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s" && local.tier != "xs"
    is_slot_enabled        = local.tier == "s" || local.tier == "xs" ? 0 : 1
    always_on              = local.tier == "xs" ? false : true
  }

  app_service_slot = {
    name = provider::dx::resource_name(merge(local.naming_config, {
      name          = "${var.environment.app_name}-staging",
      resource_type = "app_service"
    }))
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }
}
