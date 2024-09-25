locals {
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"

  # For backwards compatibility
  # If no legacy value is passed, use the original value
  # TO DO: Remove this in the next major release and replace all local.tier with var.tier
  tier = var.tier == "test" ? "s" : var.tier == "standard" ? "m" : var.tier == "premium" ? "l" : var.tier

  app_service_plan = {
    enable = var.app_service_plan_id == null
  }

  app_service = {
    sku_name               = local.tier == "s" ? "B1" : local.tier == "m" ? "P0v3" : local.tier == "l" ? "P1v3" : local.tier == "xl" ? "P2v3" : "B1"
    zone_balancing_enabled = local.tier != "s"
    is_slot_enabled        = local.tier == "s" ? 0 : 1
  }

  application_insights = {
    enable = var.application_insights_connection_string != null
  }
}
