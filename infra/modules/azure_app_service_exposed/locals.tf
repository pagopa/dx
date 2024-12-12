locals {
  app_service_plan = {
    enable = var.app_service_plan_id == null
  }

  app_service = {
    name                   = "${module.naming_convention.prefix}-app-${module.naming_convention.suffix}"
    sku_name               = local.sku_name_mapping[local.tier]
    zone_balancing_enabled = local.tier != "s" && local.tier != "xs"
    is_slot_enabled        = local.tier == "s" || local.tier == "xs" ? 0 : 1
    always_on              = local.tier == "xs" ? false : true
    command_line           = var.pm2_startup_file_name == null ? null : "pm2 start ${var.pm2_startup_file_name} -i max --no-daemon"
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }
}
