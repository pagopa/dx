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
    startup_command = (var.stack == "node"
      ? (var.startup_command == "" ? "pm2 start index.js -i max --no-daemon" : var.startup_command)
      : (var.stack == "java" && var.startup_command == "" ? null : var.startup_command)
    )
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }
}
