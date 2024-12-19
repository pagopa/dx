locals {
  app_service_plan = {
    enable = var.app_service_plan_id == null
  }

  app_service = {
    name                   = module.naming_convention.name.app_service["1"]
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s" && local.tier != "xs"
    is_slot_enabled        = local.tier == "s" || local.tier == "xs" ? 0 : 1
    always_on              = local.tier == "xs" ? false : true
  }

  app_service_slot = {
    name = "staging"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }
}
